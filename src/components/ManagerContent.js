import React, { Component } from 'react'
import ContentEditable from 'react-contenteditable'
import Popover from 'react-text-selection-popover'
import $ from 'jquery'
import rangy from 'rangy'
import 'rangy/lib/rangy-classapplier'

import AutoComplete from './AutoComplete'
import Tags from './Tags'
import SliderX from './Slider'
import Modal from './Modal'
import HttpService from '../services/HttpService'
import { l, cl, auth, rand, sp } from '../helpers/common'

let tmpHtml
, suggTags = []
, hoverSelId
, hoverEl
, currTarget
// , currSelGlobal
, isSelecting = false
, isEditing = false
, createInside = false
 //For placeholder
, isTyping = false
, currPlhStart
// To watch span value changes
, mutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver

export default class ManagerContent extends Component {
  constructor(props){
    super(props)
    // l(this.props)
    rangy.init()
    this.contentEditable = React.createRef()
    this.ctnMainRef = React.createRef()
    this.popRef = React.createRef()
    this.plhRef = React.createRef()
    this.http = new HttpService()
    this.state = {
      name: "Yulia",
      username: "yulia@mail.ru",
      notifType: "", // "", greeting, submit, thanks
      source: { name: "" },
      suggSources: [],      
      ceContent: "",
      pq: 0,
      // notifType: "", 
      // source: { name: "the-verge.ru" },
      // ceContent: "Mark tags in text User select part of text (word or phrase) Tag-button. Search for tag, then select Setup PTQ-value for tag: from 0 to 100 with step 10 Every word could have any tags After tags are added user could delete them if they were added by mistake. He hovers mouse on marked word or phrase, gets list of tags, deletes them. Emoji-button Choose one emotion",
      // pq: 40,
      noSource: false,
      popPos: "up",
      popOpen: false,
      popType: "",
      tagStep: 1,
      suggTags: [],
      selTagArr: [],
      selEmoArr: [],
      hoverTagArr: [],
      hoverEmo: 0,
      hoverSelId: null,
      tempSelObj: { 
        ptq: 0, 
        tagArr: [], 
        emotion: 0, 
        editType: "add"
      },
      popPlhOpen: false,
      plhArr: [],
      filterPlhArr: [],
      plhHighIdx: 0,
      currPlh: "",
      showTxtErr: false,
      showModal: false,
      upFile: "",
      showProgress: false,
      upProgress: 0
    }
  }

  componentDidMount(){
    this.http
    .get('/api/v1/reviews/placeholders', {}, auth)
    .then(res => {
      // l(res)
      this.setState({ 
        plhArr: res.data.placeholders,
        filterPlhArr: res.data.placeholders,
      })
    })
    .catch(err => {
      l(err)
    })

    $(document).on("mouseenter mouseup", ".mark", e => {  
      this.showHoverPopover(e)
    })

    $(document).on("mouseleave", ".mark", e => {
      if(!$(e.relatedTarget).hasClass("ctn-pop-hover")){  
        this.hideHoverPopover()        
      }
    })

    $(document).on("mouseleave", ".ctn-pop-hover", e => {
      if(!$(e.relatedTarget).hasClass("mark")){
        this.hideHoverPopover()
      }
    })
  }

  componentDidUpdate(){
    setTimeout(() => {
      $(".ctn-pop-outer").css({ opacity: 1 })
    }, 100)
  }

  showHoverPopover = e => {
    let mainParent = this.contentEditable.current
    if(!isSelecting && !isEditing && !$(mainParent).find(".highlight").length){
      let el = $(e.target)

      // Getting data for this selId
      let selid = el.attr("selid")
      , selTagArr = this.state.selTagArr.filter(s => s.selId === selid)
      , selEmoArr = this.state.selEmoArr.filter(s => s.selId === selid)      
      
      hoverSelId = selid
      hoverEl = el

      let tempState = {
        hoverTagArr: selTagArr.length ? selTagArr[0].tagArr: [],
        hoverPtq: selTagArr.length ? selTagArr[0].ptq: 0,
        hoverEmo: selEmoArr.length ? selEmoArr[0].emotion : 0
      }

      this.setState(tempState, () => {  
        // Showing popup on hover
        let pop = $(this.popRef.current)
        , pos = $(el).position()
        , width = $(el).width()

        pop.css({
          // left: pos.left + width / 2 - pop.width() / 2, 
          display: "block",
          left: pos.left + width / 2, 
          transform: "translateX(-50%)", // Neat trick!
          top: pos.top - 50, // May include height later
        })

      })
    }
  }

  hideHoverPopover = () => {
    // l(this.state.selTagArr, this.state.selEmoArr)
    let pop = $(this.popRef.current)
    pop.css({
      display: "none",
    })
  }

  setNotification = notifType => this.setState({ notifType })
  
  backToMain = type => {
    if(type !== "undo"){
      this.setState({ 
        notifType: "",
        source: { name: "" },
        ceContent: "",
        pq: 0,
        selTagArr: [],
        selEmoArr: [],
        upFile: "",
        showProgress: false,
        upProgress: 0
      })
    } else{
      this.setState({ notifType: "", upProgress: 0 })
    }
  }
  
  logout = () => this.props.logout()
  
  handleSourceChange = name => {
    this.setState({ 
      source: { name },
      noSource: name === "",
      showCreateSource: name !== "" && this.state.suggSources.length === 0
    })
  }

  handleSourceSugg = suggSources => {
    this.setState({ 
      suggSources,
      showCreateSource: this.state.source.name !== "" && suggSources.length === 0          
    })  
  }
  
  sourceAdded = source => this.setState({ source })  
  
  createSource = () => {
    this.http
    .post('/api/v1/sources', {
      name: this.state.source.name
    }, auth)
    .then(res => {
      l(res)
      this.setState({ showCreateSource: false })
    })
    .catch(err => l(err))
  }

  //   handleMouseDown = e => {
  //     l("Mouse Down on contenteditable")
  //     sp(e)
  //     this.setState({ 
  //       showCreateSource: false
  //     })
  //     if(currSel) currSel.removeAllRanges() 
  // 
  //     this.closePopover(0, tmpHtml)
  //   }

  handleCeChange = evt => {
    let parent = $(this.contentEditable.current)
    , val = evt.target.value

    if(val === "<br>" || val === "<div><br></div>") val = ""

    this.setState({ ceContent: val }, () => {
      tmpHtml = parent.html()      
    })
  }

  handlePaste = e => {
    e.preventDefault()
    let pasteData = e.clipboardData.getData('text/plain')
    // l(pasteData)
    document.execCommand('insertHTML', false, pasteData)
  }

  handleMouseMove = e => {
    isSelecting = rangy.getSelection().toString().length > 0 
    if(isSelecting) this.hideHoverPopover()
  }

  handleMouseDownOutside = e => {
    // l("Mouse Down outside")

    let mainParent = $(this.contentEditable.current)
    , elementsToRemove = mainParent.find(".highlight")
    , elLength = elementsToRemove.length

    // l("Remove these elements!", elementsToRemove)

    if(elLength === 1) {
      elementsToRemove
      .replaceWith(elementsToRemove.html())
    }
    else {          
      elementsToRemove.each((idx, obj) => {
        let el = $(obj)
        if(idx === 0)
          el.replaceWith(el.html())
        else if(idx === elLength - 1)
          el.replaceWith(el.html())
        else
          el.replaceWith(el.html())
      })
    }

    if(mainParent.length) mainParent[0].normalize()
    tmpHtml = mainParent.html()
    this.closePopover(0, tmpHtml)
  }

  handleMouseUp = e => {    
    hoverEl = null    
    // hoverSelId = null

    // Preserving html in case no tags added
    let parent = this.contentEditable.current
    tmpHtml = $(parent).html()
    // l(tmpHtml)
    
    let currSel = rangy.getSelection()
    , selText = currSel.toString()    
    
    // currSelGlobal = {
    //   a: currSel.anchorOffset,
    //   f: currSel.focusOffset,
    // }
    // 
    // currSelGlobal.length = currSelGlobal.f - currSelGlobal.a
    // if(currSelGlobal.length === 0) currSelGlobal.length = 1
    // else if(currSel.isBackwards()) currSelGlobal.length*= -1    

    if(selText.length){

      // l(e.target)
      if($(e.target).hasClass("mark")) createInside = true
      else createInside = false

      let tempSelObj = this.state.tempSelObj      
      tempSelObj.selId =  rand(5)
      tempSelObj.text  =  selText.replace(/\[|\]/g, '')

      if(currSel.isBackwards()){
        tempSelObj.start =  currSel.focusOffset
        tempSelObj.end   =  currSel.anchorOffset - 1
      } else{        
        tempSelObj.start =  currSel.anchorOffset
        tempSelObj.end   =  currSel.focusOffset - 1
      }

      this.setState({ 
        tempSelObj,
        popOpen: true,
      }, () => {
        this.highlightSelection(currSel.getRangeAt(0))
        // currSel.removeAllRanges() // Not needed because user can't copy-paste 
      })

      // Get suggested keywords for selected text
      this.http
      .get('/api/v1/suggested_tag_for_text', { query: tempSelObj.text })
      .then(res => {
        // l(res)
        suggTags = []
        if(res.data.results){
          suggTags = res.data.results
        }

        // Set to state in openPopover, because needed then        
        // this.setState({ suggTags })
      })
      .catch(err => {
        l(err)
      }) 

    } else{
      this.setState({ popOpen: false })
    }
  }

  highlightSelection = sel => {
    let opts = { elementAttributes: { selid: this.state.tempSelObj.selId } }
    rangy
    .createClassApplier('highlight', opts)
    .applyToSelection()    
  }

  openPopover = options => {
    // l(hoverSelId, options)
    let tempSelObj = this.state.tempSelObj

    if(options.edit){
      isEditing = true
      this.hideHoverPopover()

      switch(options.type){
        case "tag":
          if(options.otherChosen){ // Copy object from other array          
            tempSelObj = Object.assign({}, this.state.selEmoArr.filter(s => s.selId === hoverSelId)[0])
            tempSelObj.editType = "add"
            tempSelObj.noCreate = true
            tempSelObj.tagArr = []
            tempSelObj.ptq = 0
          } else { // Take existing object from own array
            tempSelObj = this.state.selTagArr.filter(s => s.selId === hoverSelId)[0]
            tempSelObj.editType = "edit"
          }        
        break;

        default: //case "emoji"
          if(options.otherChosen){ // Copy object from other array          
            tempSelObj = Object.assign({}, this.state.selTagArr.filter(s => s.selId === hoverSelId)[0])
            tempSelObj.editType = "add"
            tempSelObj.noCreate = true            
            tempSelObj.emotion = 0
          } else { // Take existing object from own array
            tempSelObj = this.state.selEmoArr.filter(s => s.selId === hoverSelId)[0]
            tempSelObj.editType = "edit"
          }
        break;
      }
    }

    tempSelObj.type = options.type

    this.setState({ 
      popOpen: true, 
      popPos: "down",
      popType: options.type,
      tempSelObj,
      suggTags,
    }, () => {
      hoverSelId = null
    })
  }

  closePopover = (e, html, maintainCursor) => {
    // l(this.state.selTagArr, this.state.selEmoArr)
    let parent = this.contentEditable.current

    this.setState({ 
      popOpen: false, 
      tagStep: 1,
      popPos: "up",
      popType: "",
      ceContent: html ? html : this.state.ceContent,
      tempSelObj: { 
        ptq: 0, 
        tagArr: [], 
        emotion: 0, 
        editType: "add"
      },
      showCreateSource: false    
    }, () => {
      tmpHtml = this.state.ceContent
      isEditing = false
      parent && parent.normalize()

      if(maintainCursor){        
        let sel = window.getSelection()
        , range = sel.getRangeAt(0)

        range.collapse(false)
        sel.removeAllRanges()
        sel.addRange(range)

        parent.focus()
      }
    })
  }
  
  tagAdded = tag => {
    let tempSelObj = this.state.tempSelObj
    , tempTagArr = tempSelObj.tagArr
    
    if(!tempTagArr.filter(t => t.id === tag.id).length)
      tempTagArr.push(tag)
    
    this.setState({ tagStep: 2, tempSelObj })
  }

  tagRemoved = tag => {
    let tempSelObj, hoverTagArr

    if(hoverSelId) tempSelObj = this.state.selTagArr.filter(s => s.selId === hoverSelId)[0]    
    else tempSelObj = this.state.tempSelObj

    hoverTagArr = tempSelObj.tagArr.filter(s => s.id !== tag.id)
    tempSelObj.tagArr = hoverTagArr

    if(!hoverSelId) this.setState({ tempSelObj, hoverTagArr, tagStep: 1 })
    else if(hoverTagArr.length) this.setState({ tempSelObj, hoverTagArr }) 
    else {
      let emoArr = this.state.selEmoArr.filter(s => s.selId === hoverSelId)
      , selTagArr = this.state.selTagArr.filter(s => s.selId !== hoverSelId)
      // Check if emoji arr also has no length. 
      if(!emoArr.length){
        // If no length, remove marked elements, remove from selTagArr
        let parent = $(this.contentEditable.current)
        , selid = hoverEl.attr("selid")
        , elToRemove = parent.find(`[selid="${selid}"]`)
        
        elToRemove.each((idx, obj) => {
          let el = $(obj)
          , elText = el.text().replace(/\[|\]/g, '')
          , prev = el.prev(".mark")
          , next = el.next(".mark")

          if(prev.length && next.length && prev.attr("selid") === next.attr("selid")){
            el.remove()
            prev.html(prev.text() + elText + next.text())
            next.remove()                    
          } else el.replaceWith(elText)
        })

        tmpHtml = parent.html()
        
        this.setState({ 
          tempSelObj, 
          selTagArr, 
          hoverTagArr, 
          tagStep: 1 
        }, () => {
          this.hideHoverPopover()
          this.closePopover(0, tmpHtml)
        })
      } else {
        // If length, normal update
        this.setState({ 
          tempSelObj, 
          selTagArr, 
          hoverTagArr           
        }) 
      }
    }
  }

  addMoreTags = () => this.setState({ tagStep: 1 })

  PTQChanged = val => {
    let tempSelObj = this.state.tempSelObj
    tempSelObj.ptq = val
    this.setState({ tempSelObj })
  }

  PQChanged = pq => this.setState({ pq })
  
  selectEmoji = num => {
    let tempSelObj

    if(hoverSelId) tempSelObj = this.state.selEmoArr.filter(s => s.selId === hoverSelId)[0]      
    else tempSelObj = this.state.tempSelObj    
    
    if(num === tempSelObj.emotion){ // Deselect
      tempSelObj.emotion = 0
    } else {
      tempSelObj.emotion = num      
    }
    this.setState({ tempSelObj })
  }

  saveSelection = () => {
    let tempSelObj = this.state.tempSelObj
    , selTagArr
    , selEmoArr

    switch(tempSelObj.type){
      case "tag": 
        switch(tempSelObj.editType){
          case "add": 
            let noCreate = !!tempSelObj.noCreate
            delete tempSelObj.type
            delete tempSelObj.editType
            delete tempSelObj.emotion
            delete tempSelObj.noCreate

            selTagArr = this.state.selTagArr
            selTagArr.push(tempSelObj)

            if(noCreate) this.setState({ selTagArr }, this.closePopover)
            else this.setState({ selTagArr }, () => {
              this.createSelectionArea("tag")
            })
          break;

          default: //case "edit"
            selTagArr = this.state.selTagArr.map(obj => {
              if(obj.selId === tempSelObj.selId) return tempSelObj
              else return obj
            })
            this.setState({ selTagArr }, this.closePopover)  
          break;
        }
      break;

      default: //case "emoji"
        switch(tempSelObj.editType){
          case "add": 
            if(tempSelObj.emotion > 0){            
              let noCreate = !!tempSelObj.noCreate            
              delete tempSelObj.type
              delete tempSelObj.editType
              delete tempSelObj.tagArr
              delete tempSelObj.ptq
              delete tempSelObj.noCreate

              selEmoArr = this.state.selEmoArr
              selEmoArr.push(tempSelObj)
              if(noCreate) this.setState({ selEmoArr }, this.closePopover)
              else this.setState({ selEmoArr }, () => {
                this.createSelectionArea("emo")
              })
            } else this.closePopover()
          break;

          default: //case "edit"
            if(tempSelObj.emotion === 0){
              let tagArr = this.state.selTagArr.filter(s => s.selId === tempSelObj.selId)
              , selEmoArr = this.state.selEmoArr.filter(s => s.selId !== tempSelObj.selId)
        
              // Check if tag arr also has no length. 
              if(!tagArr.length){
                // If no length, remove marked elements, remove from selTagArr
                let parent = $(this.contentEditable.current)
                , selid = hoverEl.attr("selid")
                , elToRemove = parent.find(`[selid="${selid}"]`)
                
                elToRemove.each((idx, obj) => {
                  let el = $(obj)
                  , elText = el.text().replace(/\[|\]/g, '')
                  , prev = el.prev(".mark")
                  , next = el.next(".mark")

                  if(prev.length && next.length && prev.attr("selid") === next.attr("selid")){
                    el.remove()
                    prev.html(prev.text() + elText + next.text())
                    next.remove()                    
                  } else el.replaceWith(elText)
                })
        
                tmpHtml = parent.html()
                this.setState({ selEmoArr }, () => { this.closePopover(0, tmpHtml) })
              } else{                        
                this.setState({ selEmoArr }, this.closePopover)
              }
            } else {
              selEmoArr = this.state.selEmoArr.map(obj => {
                if(obj.selId === tempSelObj.selId) return tempSelObj
                else return obj
              })
              this.setState({ selEmoArr }, this.closePopover)
            }
          break;
        }
      break;     
    }
  }

  createSelectionArea = type => {
    let parent = $(this.contentEditable.current)
    , selEl = parent.find(`[selid="${this.state.tempSelObj.selId}"]`)

    selEl
    .removeClass("highlight")
    .addClass("mark")

    if(selEl.length > 1){ // Tag outside tag
      if(createInside){ // Tag outside tag, but inside bigger tag
        let selElArr = selEl.toArray()
        selElArr.forEach((obj, idx) => {
          let selEl = $(obj)
          , tempParent = selEl.parent()
          , childNodes = tempParent[0].childNodes
          
          // l(selEl, tempParent, childNodes)
          // l(childNodes)
          let tempStr = ""
          if(idx === 0){
            tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">${childNodes[0].textContent}</span>`
            // tempStr+= `<span selid="${selEl.attr("selid")}" class="mark">[${childNodes[1].textContent}</span>`
            if(childNodes[1]) tempStr+= `<span selid="${selEl.attr("selid")}" class="mark">[${childNodes[1].textContent}</span>`
            else tempStr+= `<span selid="${selEl.attr("selid")}" class="mark">[</span>`            
          } else if(idx === selElArr.length - 1){
            tempStr+= `<span selid="${selEl.attr("selid")}" class="mark">${childNodes[0].textContent}]</span>`
            // tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">${childNodes[1].textContent}</span>`
            if(childNodes[1]) tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">${childNodes[1].textContent}</span>`
          } else{
            tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">${childNodes[0].textContent}</span>`
          }

          tempParent.replaceWith(tempStr)
        })
      } else{
        selEl.eq(0).html("[" + selEl.eq(0).html())
        selEl.eq(selEl.length - 1).html(selEl.eq(selEl.length - 1).html() + "]")
      }

      selEl.toArray().forEach(elem => {
        let el = $(elem)
        let parent = el.parent()
        while(parent.hasClass("mark")){
          parent.html(el.html())
          el = parent
          parent = el.parent()
        }
      })
    }else{
      if(createInside){ // Tag inside tag
        let tempParent = selEl.parent()
        , childNodes = tempParent[0].childNodes
        
        // l(selEl, tempParent, childNodes)

        let tempStr = ""
        tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">${childNodes[0].textContent}</span>`
        
        if(childNodes[2]){
          tempStr+= `<span selid="${selEl.attr("selid")}" class="mark">[${childNodes[1].textContent}]</span>`
          tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">${childNodes[2].textContent}</span>`
        } else {
          tempStr+= `<span selid="${selEl.attr("selid")}" class="mark">[${childNodes[1].textContent}</span>`
          tempStr+= `<span selid="${tempParent.attr("selid")}" class="mark">]</span>`          
        }

        tempParent.replaceWith(tempStr)
      } else{  // Single tag      
        selEl.html("[" + selEl.html() + "]")
      }
    }

    this.addObservers()
    rangy.getSelection().removeAllRanges()
    this.closePopover(0, parent.html())

    // Finding length of previous nodes to add to caret position as it is returned relative to current node
    let { tempSelObj } = this.state
    , newSelEl = parent.find(`[selid="${tempSelObj.selId}"]`)
    , nodeArr = [...parent[0].childNodes]
    , nodeIdx = nodeArr.indexOf(newSelEl[0])
    , tempLength = 0, i = 0

    // while(nodeArr[i] !== newSelEl[0]){
    while(nodeArr[i].textContent !== newSelEl[0].textContent){
      tempLength+= nodeArr[i].textContent.replace(/\[|\]/g, '').length
      i++
    }
    // l(parent[0].childNodes, newSelEl[0], nodeIdx, tempLength)

    // Saving correct start and end of text for all situations
    let caretPosStart = tempLength
    , caretPosEnd = tempSelObj.start

    selEl.toArray().forEach(el => caretPosEnd+= el.textContent.replace(/\[|\]/g, '').length)
    caretPosEnd+= tempLength - tempSelObj.start - 1    

    if(type === "emo"){ 
      let { selEmoArr } = this.state

      selEmoArr.filter(s => s.selId === tempSelObj.selId)[0].start = caretPosStart
      selEmoArr.filter(s => s.selId === tempSelObj.selId)[0].end = caretPosEnd
      
      this.setState({ selEmoArr }, () => {
        // l(this.state.selEmoArr)
      })
    } else{
      let { selTagArr } = this.state

      selTagArr.filter(s => s.selId === tempSelObj.selId)[0].start = caretPosStart
      selTagArr.filter(s => s.selId === tempSelObj.selId)[0].end = caretPosEnd

      this.setState({ selTagArr }, () => {
        // l(this.state.selTagArr)
      }) 
    }
  }
  
  addObservers = () => {
    // Attach MutationObserver to created spans to know selid of changed span
    let parent = $(this.contentEditable.current)
    , config = { childList: true, characterData: true, characterDataOldValue:true, subtree: true }
    , targets = parent.find("span.mark").toArray() // To observe all elements, even previous

    targets.forEach(target => {
      new mutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'characterData') {
            currTarget = mutation.target.parentNode
          }
        })
      })
      .observe(target, config)
    })
  }

//   deleteSelection = () => {
//     let parent = $(this.contentEditable.current)
//     , elToRemove = parent.find(`[selid="${hoverSelId}"]`)
//     , selEmoArr = this.state.selEmoArr.filter(s => s.selId !== hoverSelId)
//     , selTagArr = this.state.selTagArr.filter(s => s.selId !== hoverSelId)
//     , prev, next, tmpObj
// 
//     if(elToRemove.length > 1){ // Remove all from first till last span
//       let start = elToRemove.eq(0)
//       , end = elToRemove.eq(elToRemove.length - 1)
//       , between = start.nextUntil(end)
//       // l(start, between, end)
//       
//       prev = start.prev(".mark")
//       next = end.next(".mark")
// 
//       between.toArray().forEach(obj => {
//         let el = $(obj)
//         selEmoArr = selEmoArr.filter(s => s.selId !== el.attr("selid"))
//         selTagArr = selTagArr.filter(s => s.selId !== el.attr("selid"))
//       })
// 
//       between.remove()
//       start.remove()
//       end.remove()
//     } else{
//       prev = elToRemove.prev(".mark")
//       next = elToRemove.next(".mark")
// 
//       selEmoArr = selEmoArr.filter(s => s.selId !== elToRemove.attr("selid"))
//       selTagArr = selTagArr.filter(s => s.selId !== elToRemove.attr("selid"))
// 
//       elToRemove.remove()
//     }
// 
//     // l(prev, next)
//     // Combining tags, updating text in the arrays
//     if(prev.length && next.length && prev.attr("selid") === next.attr("selid")){        
//       prev.html(prev.text() + next.text())
//       next.remove()
// 
//       tmpObj = selEmoArr.filter(s => s.selId === prev.attr("selid"))[0]
//       if(tmpObj){ tmpObj.text = prev.text().replace(/\[|\]/g, '') }
// 
//       tmpObj = selTagArr.filter(s => s.selId === prev.attr("selid"))[0]
//       if(tmpObj){ tmpObj.text = prev.text().replace(/\[|\]/g, '') }
//     }
// 
//     if(parent[0]) parent[0].normalize()
// 
//     this.setState({ selEmoArr, selTagArr, ceContent: parent.html() }, () => {
//       l(this.state.selTagArr, this.state.selEmoArr)
//       this.hideHoverPopover()
//     })
//   }

  setShowTextErr = showTxtErr => this.setState({ showTxtErr })
  
  showTextErr = () => {
    this.setShowTextErr(true)
    setTimeout(() => { this.setShowTextErr(false) }, 3000)
  }

  getRandomText = e => {
    sp(e)
    this.http
    .get('/api/v1/get_text', { type: "original" }, auth)
    .then(res => {
      if(res.data.text){        
        this.setState({
          ceContent: res.data.text
        })
      } else this.showTextErr()
    })
    .catch(err => {
      l(err)
      this.showTextErr()
    })
  }

  scrollParentToChild = (parent, child) => {
    // Where is the parent on page
    let parentRect = parent.getBoundingClientRect()
    // What can you see?
    , parentViewableArea = {
      height: parent.clientHeight,
      width: parent.clientWidth
    }
    // Where is the child
    , childRect = child.getBoundingClientRect()
    // Is the child viewable?
    , isViewable = (childRect.top >= parentRect.top) && (childRect.top <= parentRect.top + parentViewableArea.height - 50);

    // if you can't see the child try to scroll parent
    if (!isViewable) {
      // scroll by offset relative to parent
      parent.scrollTop = (childRect.top + parent.scrollTop) - parentRect.top
    }
  }
  
  handleKeyUp = e => {
    if(!isTyping){ // If not typing for placeholder
      // l(currTarget)
      let parent = $(this.contentEditable.current)
      , currId = $(currTarget).attr("selid")
      , allEl = parent.find(`[selid="${currId}"]`)
      , watchForText = []
      , watchForPos = []
      , leftElArr = [] // Elements to left of current 
      , prev, next, tempObj
      , diffInText
      , { selEmoArr } = this.state
      , { selTagArr } = this.state


      if(allEl.length > 1){
        prev = allEl.eq(0)
        next = allEl.eq(1)
      } else{
        prev = next = allEl.eq(0)
      }

      while(prev.length && next.length && prev.attr("selid") === next.attr("selid")){
        watchForText.push(prev.attr("selid"))
        prev = prev.prev(".mark")
        next = next.next(".mark")
      }

      watchForPos = $(currTarget)
        .nextAll(".mark")
        .addBack()
        .toArray()
        .map(e => $(e).attr("selid"))
        .filter((v, i, a) => a.indexOf(v) === i)

      leftElArr = $(currTarget)
        .prevAll(".mark")
        .toArray()
        .map(e => $(e).attr("selid"))
        .filter((v, i, a) => a.indexOf(v) === i)

      // l(watchForText, currId, watchForPos, leftElArr)

      watchForText.forEach(selId => {
        // Check if single or split (tag inside tag)
        let allEl = parent.find(`[selid="${selId}"]`), oldText, newText

        if(allEl.length > 1){
          let start = allEl.eq(0)
          , end = allEl.eq(allEl.length - 1)
          , between = start.nextUntil(end)
          // l(start, between, end)
          newText = start.text() + between.text() + end.text()
        } else newText = allEl.text()

        newText = newText.replace(/\[|\]/g, '')
        
        tempObj = selEmoArr.filter(s => s.selId === selId)
        if(tempObj.length) {
          oldText = tempObj[0].text
          diffInText = oldText.length - newText.length
          tempObj[0].text = newText
          // l(oldText, newText, diffInText)
        }

        tempObj = selTagArr.filter(s => s.selId === selId)
        if(tempObj.length) {
          oldText = tempObj[0].text
          diffInText = oldText.length - newText.length
          tempObj[0].text = newText
          // l(oldText, newText, diffInText)
        }

        if(!newText.length){ 
          selEmoArr = selEmoArr.filter(s => s.selId !== selId)
          selTagArr = selTagArr.filter(s => s.selId !== selId)
          $(currTarget).remove() 
        }
      })

      watchForPos.forEach(selId => {
        if(selId === currId || leftElArr.indexOf(selId) > -1){ 
          // Skip position start change if selId on both left and right of current
          tempObj = selEmoArr.filter(s => s.selId === selId)
          if(tempObj.length) { tempObj[0].end-= diffInText }
          
          tempObj = selTagArr.filter(s => s.selId === selId)
          if(tempObj.length) { tempObj[0].end-= diffInText }
        } else {
          tempObj = selEmoArr.filter(s => s.selId === selId)
          if(tempObj.length) { 
            tempObj[0].start-= diffInText
            tempObj[0].end-= diffInText
          }

          tempObj = selTagArr.filter(s => s.selId === selId)
          if(tempObj.length) { 
            tempObj[0].start-= diffInText
            tempObj[0].end-= diffInText
          }
        }
      })

      // Entire element removed (mutation observer not called, using hoverSelId)
      if(!parent.find(`[selid="${hoverSelId}"]`).length){
        // l("Element is no more.")
        selEmoArr = selEmoArr.filter(s => s.selId !== hoverSelId)
        selTagArr = selTagArr.filter(s => s.selId !== hoverSelId)
      }

      this.setState({ 
        selTagArr, 
        selEmoArr,
        ceContent: parent.html()
      }, () => {
        // l(this.state.selTagArr, this.state.selEmoArr)
        this.closePopover(0, parent.html(), true) // true for maintaining cursor position    
        this.hideHoverPopover()  
      })
    }
  }
  
  handleKeyDown = e => {
    let key = e.keyCode
    if(!isTyping){
      if(key === 219 && e.shiftKey){ // '{' key
        isTyping = true        
        currPlhStart = rangy.getSelection()
        // l(currPlhStart)
        this.setState({ popPlhOpen: true })
      }
    }else if(isTyping){
      // l(key)
      switch(key){
        case 38: // Up 
        case 40: // Down
          e.preventDefault()
          e.stopPropagation()

          // Focus on the popover, highlight option
          let length = this.state.filterPlhArr.length
          , plhHighIdx = this.state.plhHighIdx
          
          if(key === 38){
            if(plhHighIdx === 0) plhHighIdx = length - 1
            else plhHighIdx--
          } else{
            if(plhHighIdx === length - 1) plhHighIdx = 0
            else plhHighIdx++          
          }

          this.setPlhHighIdx(plhHighIdx)                  
        break;

        case 17: // Ctrl
        case 16: // Shift
        case 13: // Enter
        case 9:  // Tab
          e.preventDefault()
          e.stopPropagation()

          l("Ignore")
          if(key === 13){
            this.processPlhInput({
              plh: this.state.filterPlhArr[this.state.plhHighIdx],
              type: "add"
            })
          }
        break;

        case 27: // Escape
          e.preventDefault()
          e.stopPropagation()

          this.processPlhInput({ type: "remove" })
        break;

        default:
          // Get typed word
          let currPlh = this.state.currPlh
          if(key === 8) { // Backspace            
            currPlh = currPlh.slice(0, -1)
          } else{          
            if(e.shiftKey){
              currPlh+= String.fromCharCode(key)
            } else{
              currPlh+= String.fromCharCode(key).toLowerCase()
            }
          }
          // l(currPlh)
          let filterPlhArr = this.state.plhArr.filter(item => 
            item
            // item.name
            .toLowerCase()
            .includes(currPlh.toLowerCase())
          )

          this.setState({ 
            currPlh,
            filterPlhArr,
            plhHighIdx: 0
          })
        break;      
      }
    }   
  }
  
  setPlhHighIdx = plhHighIdx => {
    this.setState({ plhHighIdx }, () => {
      this.scrollParentToChild($(".plh-sugg-outer")[0], $(".plh-highlighted")[0])      
    })
  }

  processPlhInput = options => {
    // l(options)
    // l("Placeholder selected")
    
    let el = this.contentEditable.current
    , currNode = currPlhStart.anchorNode
    , textContent = currNode.textContent
    , currPlh = this.state.currPlh
    , nodeParts = [
      textContent.slice(0, currPlhStart.anchorOffset),
      textContent
      .slice(currPlhStart.anchorOffset + 1, textContent.length)
      .replace(currPlh, ""),
    ] 
    , plh

    if(options.type === "add") { // Add text from list or user input
      plh = options.plh    
      if(plh) {
        if(options.isClick){
          currNode.textContent = nodeParts[0] + plh.slice(1, plh.length - 1) + "} " + nodeParts[1]
        } else{          
          currNode.textContent = nodeParts[0] + plh + " " + nodeParts[1]
          // currNode.textContent = nodeParts[0] + "{" + plh.name + "} " + nodeParts[1]
        }
      } else {
        currNode.textContent = nodeParts[0] + "{" + currPlh + "} " + nodeParts[1]
      }
    } else { // Restore original
      currNode.textContent = nodeParts[0] + nodeParts[1]
    } 

    this.setState({ 
      popPlhOpen: false,
      filterPlhArr: this.state.plhArr,
      currPlh: "",
      plhHighIdx: 0,
      ceContent: $(el).html()
    }, () => {
      let range = document.createRange()
      , sel = window.getSelection()

      if(options.type === "add") {
        try{
          if(plh) {
            if(options.isClick){
              range.setStart(currNode, currPlhStart.focusOffset + plh.length)
            } else{              
              range.setStart(currNode, currPlhStart.focusOffset + plh.length + 1)
              // range.setStart(currNode, currPlhStart.focusOffset + plh.name.length + 3)
            }
          } else{
            range.setStart(currNode, currPlhStart.focusOffset + currPlh.length + 3)        
          }
        }catch(err){
          // l(err)
        }
      } else {
        range.setStart(currNode, currPlhStart.focusOffset)        
      }

      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
      el.focus()
      
      isTyping = false
    })
  }

  submit = e => {
    sp(e)     
    let tags = this.state.selTagArr.map(s => {
      let { start, end, text, ptq } = s
      return { 
        start, end, text, ptq,
        tag_id: s.tagArr.map(t => t.id)
      }
    })
    , emotions = this.state.selEmoArr.map(s => {
      let { start, end, text, emotion } = s
      return { start, end, text, emotion }
    })
    , req

    if(this.state.upFile === ""){      
      req = {
        user_type: "content_manager",
        source: this.state.source.name,
        text: $(this.contentEditable.current).text().replace(/\[|\]/g, ''),
        pq: this.state.pq, 
        tags, emotions
      }
    } else{
      req = new FormData()
      req.append("file", this.state.upFile)
      req.append("user_type", "content_manager")
      req.append("source", this.state.source.name)
      req.append("text", $(this.contentEditable.current).text().replace(/\[|\]/g, ''))
      req.append("pq", this.state.pq)
      tags.forEach(t => req.append("tags[]", t))
      emotions.forEach(e => req.append("emotions[]", e))
      this.setState({ showProgress: true, showModal: true })
    }

    l(req)
    this.http
    .post('/api/v1/submit_data', req, auth, this.onUploadProgress)
    .then(res => {
      l(res)
      this.child && this.child.handleCloseClick()
      this.setState({ notifType: "submit" })
    })
    .catch(err => l(err))
  }

  onUploadProgress = e => {
    let upProgress = Math.floor((e.loaded * 100) / e.total)
    this.setState({ upProgress })
  }

  handleModalShowClick = e => {
    e.preventDefault()
    this.setState({ showModal: true })
  }

  handleModalCloseClick = () => {
    this.setState({ showModal: false })
  }
  
  fileChosen = upFile => this.setState({ upFile })

  render(){
    const placeUpOrDown = ({
      gap,
      frameWidth,
      frameLeft,
      frameTop,
      boxHeight,
      boxWidth,
      selectionTop,
      selectionLeft,
      selectionWidth,
      selectionHeight
    }) => {
      const style = { 
        position: "fixed",
        zIndex: 1
      }

      if(hoverEl){    
        style.position =  "absolute"
        style.left = hoverEl.position().left + hoverEl.width()/2
        style.top = hoverEl.position().top + hoverEl.height() + 5
        style.transform = "translateX(-50%)"
      } else{        
        style.left = selectionLeft + (selectionWidth / 2) - (boxWidth / 2)
        style.top = selectionTop - boxHeight - gap

        if (style.left < frameLeft) {
          style.left = frameLeft
        } else if (style.left + boxWidth > frameWidth) {
          style.left = frameWidth - boxWidth
        }

        // if(this.state.popPos === "down"){
        //   style.top = selectionTop + selectionHeight + gap
        // }
       
        if (style.top < frameTop || this.state.popPos === "down") { // Switch for up/down
          style.top = selectionTop + selectionHeight + gap
        }
      }

      return style
    }
    , placeDown = ({
      gap,
      frameWidth,
      frameLeft,
      frameTop,
      boxHeight,
      boxWidth,
      selectionTop,
      selectionLeft,
      selectionWidth,
      selectionHeight
    }) => {
      const style = { 
        position: "fixed",
        zIndex: 1
      }
      style.left = selectionLeft + (selectionWidth / 2) - (boxWidth / 2)
      style.top = selectionTop + selectionHeight + gap
      return style
    }

    let hoverEmoImg = null
    if(this.state.hoverEmo > 0) {
      switch(this.state.hoverEmo){
        case 1: hoverEmoImg = "assets/emo-1.svg"; break;
        case 2: hoverEmoImg = "assets/emo-2.svg"; break;
        case 3: hoverEmoImg = "assets/emo-3.svg"; break;
        case 4: hoverEmoImg = "assets/emo-4.svg"; break;
        default: hoverEmoImg = "assets/emo-5.svg"; break; //case 5
      }
    }

    return (
      <div className="manager-outer" onMouseDown={this.handleMouseDownOutside}>
        <nav className="navbar navbar-expand-lg navbar-dark">
          <a className="navbar-brand" href="javascript:void(0)">
            <img src="assets/pino.svg" alt=""/>
          </a>
          <div className="ml-auto">
            <ul className="navbar-nav">
              <li className="nav-item">
                <img className="avatar mx-3" src="assets/alert.svg" alt="" />                
              </li>
              <li className="nav-item">
                <img className="avatar" src="assets/user-icon.png" alt="" />
                <span className="mx-3">{this.state.username}</span>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="javascript:void(0)" data-toggle="dropdown">
                </a>
                <div className="dropdown-menu">
                  <a className="dropdown-item" onClick={this.logout} href="javascript:void(0)">Logout</a>
                </div>
              </li>
            </ul>
          </div>
        </nav>
        <div className="content">
          
          {this.state.showTxtErr && <div className="txt-err">
            <img src="assets/bounds.svg" alt=" "/>
            <span>Sorry. We don’t have any random texts at the moment.</span>
            <img onClick={() => this.setShowTextErr(false)} src="assets/bounds.svg" alt=" "/>
          </div>}
          
          {this.state.notifType === "greeting" && <div className="notif-outer">
            <div className="notif-inner">
              <img src="assets/sun.svg" alt=""/>
              <div className="title">                
                Hey {this.state.name}! Let's add some texts today!
              </div>
              <button className="btn-accent" onClick={() => this.setNotification("")} type="button">Let's go</button>
              <div className="txt-rem">Texts remaining 15/15</div>
            </div>
          </div>}

          {this.state.notifType === "submit" && <div className="notif-outer">
            <div className="notif-inner">
              <img src="assets/fountain.svg" alt=""/>
              <div className="title">                
                Your text has been sent for review successfully.
              </div>
              {/* <button className="btn-accent" onClick={() => this.setNotification("")} type="button">Next</button>               */}
              <button className="btn-accent" onClick={() => this.backToMain("")} type="button">Next</button>              
              <button className="btn-accent btn-anchor" onClick={() => this.backToMain("undo")} type="button">Undo</button>              
            </div>
          </div>}

          {this.state.notifType === "thanks" && <div className="notif-outer">
            <div className="notif-inner">
              <img src="assets/popcorn.svg" alt=""/>
              <div className="title">                
                Thanks!<br/> 
                It's 15 texts today, see you tomorrow for more!
              </div>              
              <button className="btn-accent" onClick={() => this.setNotification("")} type="button">Ok</button>              
            </div>
          </div>}

          {this.state.notifType === "" && <div className="content-outer">
            <div className="container">
              <div className="ctn-text ctn-source">
                <img src="assets/link.svg" alt=""/>
                <AutoComplete
                  inputProps={{
                    className: 'auto-inp source',
                    placeholder: 'Source link',
                    value: this.state.source.name
                  }}
                  type="sources"
                  optionSelected={this.sourceAdded}
                  inputChanged={this.handleSourceChange}
                  getCurrSugg={this.handleSourceSugg}
                 />
                 {this.state.showCreateSource && <div className="ctn-no-sugg">
                    No suggested sources. <a onClick={this.createSource} href="javascript:void(0)">Click to Create Source</a>               
                  </div>}
              </div>

              <div className="ctn-text ctn-text-main" ref={this.ctnMainRef}>
                <img className="plh" src="assets/align-left.svg" alt=""/>

                <ContentEditable
                  placeholder={"Add some text and tags .."}
                  className="ctn-text-content"
                  innerRef={this.contentEditable}
                  html={this.state.ceContent} // innerHTML of the editable div                  
                  onChange={this.handleCeChange} // handle innerHTML change
                  onMouseMove={this.handleMouseMove}
                  // onMouseDown={this.handleMouseDown}
                  onMouseUp={this.handleMouseUp}                  
                  onPaste={this.handlePaste}
                  onKeyUp={this.handleKeyUp}
                  onKeyDown={this.handleKeyDown}
                />

                <SliderX
                  className="slider-main"
                  style={{ display: this.state.ceContent === "" ? "none" : "block"}}
                  ptq={this.state.pq} 
                  changePTQ={this.PQChanged} 
                  title="PQ (Place Quality)"
                />

                {/* Popover on Selection */}
                <Popover
                  isOpen={this.state.popOpen}
                  containerNode={this.ctnMainRef.current}
                  selectionRef={this.contentEditable}
                  placementStrategy={placeUpOrDown}
                >
                  <div onMouseDown={sp} className={`ctn-pop-outer ${this.state.popPos==="up"?"arrow-bottom":"arrow-top"}`}>
                    {this.state.popType === "" && <div className="ctn-btn-empty">
                      <img 
                        onClick={() => this.openPopover({
                          type: "tag", edit: false
                        })} 
                        src="assets/tag-white.svg" alt=" "/>
                      <img 
                        onClick={() => this.openPopover({
                          type: "emoji", edit: false
                        })} 
                        src="assets/emoji.svg" alt=" "/>
                    </div>}

                    {this.state.popType === "tag" && <div className="ctn-pop-inner ctn-tag">
                      
                      {this.state.tagStep === 1 && <AutoComplete
                        inputProps={{
                          className: 'auto-inp',
                          placeholder: 'Find the tag ..',
                        }}
                        type="tag"
                        optionSelected={this.tagAdded}
                        // inputChanged={this.handleAutoInput}
                        // getCurrSugg={this.handleSuggestions}
                      />}                      
                      {this.state.tagStep === 1 && <img 
                        onClick={e => this.closePopover(e, tmpHtml)} 
                        className="close"
                        src="assets/bounds.svg" alt=" "
                      />}                      
                      {this.state.tagStep === 1 && 
                        this.state.suggTags.length > 0 && <div className="ctn-sugg">
                        <div className="sugg-title">
                          Suggested Tags:
                        </div>
                        <Tags 
                          isSuggested={true}
                          tagArr={this.state.suggTags} 
                          suggestTag={this.tagAdded}                          
                        />
                      </div>}
                      
                      {this.state.tagStep === 2 && <div className="ctn-ptq">
                        <div className="ctn-tags-chosen">
                          <Tags 
                            tagArr={this.state.tempSelObj.tagArr} 
                            addMoreTags={this.addMoreTags}
                            removeTag={this.tagRemoved}
                          />
                        </div>
                        <img 
                          onClick={e => this.closePopover(e, tmpHtml)} 
                          className="close"
                          src="assets/bounds.svg" alt=" "
                        />
                        <div className="ctn-ptq-opt">
                          <SliderX 
                            ptq={this.state.tempSelObj.ptq} 
                            title="Choose PTQ (Place-tag Quality)"
                            changePTQ={this.PTQChanged} 
                          />
                        </div>
                        <button onClick={this.saveSelection} className="btn-accent">Submit</button>
                      </div>}
                    </div>}

                    {this.state.popType === "emoji" && <div className="ctn-pop-inner ctn-emo">
                      <img 
                        onClick={e => this.closePopover(e, tmpHtml)} 
                        className="close"
                        src="assets/bounds.svg" alt=" "
                      />
                      <div className="ctn-emo-plh"></div>
                      <div className="ctn-emo-inner">
                        Choose an emotion
                        <div className="emo-outer">
                          <div 
                            className={`emo-single ${this.state.tempSelObj.emotion === 1?"active":""}`}
                            onClick={() => this.selectEmoji(1)}
                          >
                            <img src="assets/emo-1.svg" alt=" " className="clr"/>
                            <img src="assets/emo-1-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={`emo-single ${this.state.tempSelObj.emotion === 2?"active":""}`}
                            onClick={() => this.selectEmoji(2)}
                          >
                            <img src="assets/emo-2.svg" alt=" " className="clr"/>
                            <img src="assets/emo-2-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={`emo-single ${this.state.tempSelObj.emotion === 3?"active":""}`}
                            onClick={() => this.selectEmoji(3)}
                          >
                            <img src="assets/emo-3.svg" alt=" " className="clr"/>
                            <img src="assets/emo-3-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={`emo-single ${this.state.tempSelObj.emotion === 4?"active":""}`}
                            onClick={() => this.selectEmoji(4)}
                          >
                            <img src="assets/emo-4.svg" alt=" " className="clr"/>
                            <img src="assets/emo-4-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={`emo-single ${this.state.tempSelObj.emotion === 5?"active":""}`}
                            onClick={() => this.selectEmoji(5)}
                          >
                            <img src="assets/emo-5.svg" alt=" " className="clr"/>
                            <img src="assets/emo-5-grey.svg" alt=" " className="bw"/>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={this.saveSelection} 
                        className="btn-accent"
                        // disabled={this.state.tempSelObj.emotion === 0}
                      >Submit</button>
                      {/* <button  */}
                      {/*   onClick={() => this.selectEmoji(0)}  */}
                      {/*   className="btn-accent btn-sec" */}
                      {/* >Clear</button> */}
                    </div>}

                  </div>
                </Popover>                

                {/* Popover on hover */}
                <div className="ctn-pop-hover arrow-bottom" ref={this.popRef}>
                  {this.state.hoverTagArr.length > 0 && <Tags
                    tagArr={this.state.hoverTagArr}
                    ptq={this.state.hoverPtq}
                    addMoreTags={() => this.openPopover({
                      type: "tag", edit: true
                    })}
                    removeTag={this.tagRemoved}
                  />}

                  {this.state.hoverTagArr.length === 0 && <img 
                    onClick={() => this.openPopover({
                      type: "tag", edit: true, otherChosen: true
                    })} 
                    src="assets/tag-white.svg" alt=" "
                    style={{ cursor: "pointer" }}
                  />}

                  {this.state.hoverEmo > 0 && <img
                    onClick={() => this.openPopover({
                      type: "emoji", edit: true
                    })}
                    className="edit"
                    src={hoverEmoImg} alt=" "                               
                  />}

                  {this.state.hoverEmo === 0 && <img
                    onClick={() => this.openPopover({
                      type: "emoji", edit: true, otherChosen: true
                    })}
                    className="edit"
                    src="assets/emoji.svg" alt=" "           
                  />}

                  {/* {(this.state.hoverTagArr.length > 0 || this.state.hoverEmo > 0) && <img */}
                  {/*   onClick={this.deleteSelection} */}
                  {/*   className="edit close" */}
                  {/*   src="assets/plus.svg" alt=" "/}
                  {/* />} */}
                </div>

                {/* Popover for placeholder */}
                <Popover
                  isOpen={this.state.popPlhOpen}
                  containerNode={this.ctnMainRef.current}
                  selectionRef={this.contentEditable}
                  placementStrategy={placeDown}
                >
                  <div className="ctn-pop-outer arrow-top">
                    <div className="ctn-plh">
                      <div className="plh-sugg-outer">
                        {this.state.filterPlhArr.length > 0 && <ul>{
                          this.state.filterPlhArr
                          .map((item, i) => {
                            return (<li 
                              key={i} 
                              onClick={() => this.processPlhInput({
                                plh: item, type: "add", isClick: true
                              })}
                              onMouseOver={() => this.setPlhHighIdx(i)}
                              className={`${this.state.plhHighIdx === i?"plh-highlighted":""}`}
                              >
                              {/* <div>{item.name}</div> */}
                              <div>{item}</div>
                            </li>)
                          })
                        }</ul>}

                        {this.state.filterPlhArr.length === 0 && <div className="ctn-no-plh">
                          No matching placeholders
                        </div>}
                      </div>
                    </div>                    
                  </div>
                </Popover>
              </div>  

              <div className="ctn-music">
                <img className="plh" src="assets/audio.svg" alt=""/>
                <a onClick={this.handleModalShowClick} href="javascript:void(0)">Add audio file</a>
                {this.state.upFile !=="" && <div>
                  Chosen file: <span className="file-name">{this.state.upFile.name}</span>
                </div>}
                {this.state.showModal ? (
                  <Modal 
                    ref={child => this.child = child}
                    showProgress={this.state.showProgress}
                    upProgress={this.state.upProgress}
                    fileChosen={this.fileChosen} 
                    handleModalCloseClick={this.handleModalCloseClick} 
                  />
                ) : null}
              </div>

            </div>
          </div>}

          <div className="ctn-buttons">
            <button className="btn-accent btn-sec" onMouseDown={this.getRandomText}>Get random text</button>
            <button className="btn-accent" onMouseDown={this.submit}>Submit</button>
          </div>
        </div>
      </div>
    )
  }
}