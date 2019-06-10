import React, { Component } from 'react'
import ContentEditable from 'react-contenteditable'
import Popover from 'react-text-selection-popover'
import $ from 'jquery'
import rangy from 'rangy'
import 'rangy/lib/rangy-classapplier'

import AutoComplete from './AutoComplete'
import Tags from './Tags'
import SliderX from './Slider'
import HttpService from '../services/HttpService'
import { l, cl, auth, rand, sp } from '../helpers/common'

let tmpHtml
, hoverSelId
, hoverEl
, isSelecting = false
, isEditing = false
 //For placeholder
, isTyping = false
, currPlhStart = 0
// , htmlBeforePlh
// , plhNodeIdx
// , plhAnchorOffset

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
      ceContent: "",
      pq: 0,
      // notifType: "", 
      // source: { name: "the-verge.ru" },
      // ceContent: "Inserting at a specific index (rather than, say, at the first space character) has to use string slicing/substring: this text is a sample. Inserting at a specific index (rather than, say, at the first space character) has to use string slicing/substring: this text is a sample",      
      // pq: 40,
      noSource: false,
      popPos: "up",
      popOpen: false,
      popType: "",
      suggTags: [],
      tagStep: 1,
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
      showTxtErr: false
    }
  }

  componentDidMount(){
    this.http
    .get('/api/v1/reviews/placeholders', {}, auth)
    // .get('/api/v1/suggested_tag_for_text', { query: 'n' })
    .then(res => {
      l(res)
      this.setState({ 
        plhArr: res.data.placeholders,
        filterPlhArr: res.data.placeholders,
      })

      // this.setState({ 
      //   plhArr: res.data.results,
      //   filterPlhArr: res.data.results,
      // })
    })
    .catch(err => {
      l(err)
    })

    $(document).on("mouseenter", ".mark", e => {
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
      , parent = el.parent()

      // Traversing up to find highest span.mark parent
      while(parent.hasClass("mark")){
        el = parent
        parent = parent.parent()
      }
      // l(el, el.attr("selid"))

      // Getting data for this selId
      let selid = el.attr("selid")
      , selTagArr = this.state.selTagArr.filter(s => s.selId === selid)
      , selEmoArr = this.state.selEmoArr.filter(s => s.selId === selid)      
      
      hoverSelId = selid
      hoverEl = el

      this.setState({
        hoverTagArr: selTagArr.length ? selTagArr[0].tagArr: [],
        hoverPtq: selTagArr.length ? selTagArr[0].ptq: 0,
        hoverEmo: selEmoArr.length ? selEmoArr[0].emotion : 0
      }, () => {

        // Applying highlight to all matched, so it looks like a group
        // currElGroup = $(mainParent).find(`[selid="${selid}"]`)
        // currElGroup.addClass("highlight")     

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
    // if(currElGroup){
    //   currElGroup.removeClass("highlight")
    //   currElGroup = null        
    // }
    // hoverEl = null

    let pop = $(this.popRef.current)
    pop.css({
      display: "none",
    })
  }

  setNotification = notifType => this.setState({ notifType })

  logout = () => this.props.logout()
  
  handleSourceChange = name => {
    this.setState({ 
      source: { name },
      noSource: name === ""
    })
  }

  sourceAdded = source => this.setState({ source })  

  handleCeChange = evt => {
    let val = evt.target.value
    if(val === "<br>" || val === "<div><br></div>") val = ""
    this.setState({ ceContent: val }, () => {
      let parent = this.contentEditable.current
      tmpHtml = $(parent).html()
    })
  }

  handlePaste = e => {
    e.preventDefault()
    document.execCommand('insertHTML', false, e.clipboardData.getData('text/plain'))
  }

  handleMouseMove = e => isSelecting = rangy.getSelection().toString().length > 0

  handleMouseDownOutside = e => {
    // l("Mouse Down outside")

    let mainParent = this.contentEditable.current
    , elementsToRemove = $(mainParent).find(".highlight")
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

    tmpHtml = $(mainParent).html()
    this.closePopover(0, tmpHtml)
  }

  // handleMouseDown = e => {
  //   // l("Mouse Down on contenteditable")
  //   sp(e)
  //   this.closePopover(0, tmpHtml)
  // }

  handleMouseUp = e => {
    hoverEl = null

    // Preserving html in case no tags added
    let parent = this.contentEditable.current
    tmpHtml = $(parent).html()
    // l(tmpHtml)

    let currSel = rangy.getSelection()
    , selText = currSel.toString()

    if(selText.length){
      let tempSelObj = this.state.tempSelObj      
      tempSelObj.selId =  rand(5)
      tempSelObj.text  =  selText.replace(/\[|\]/g, '')
      tempSelObj.start =  currSel.anchorOffset
      tempSelObj.end   =  currSel.focusOffset - 1

      // Get suggested keywords for selected text
      this.http
      .get('/api/v1/suggested_tag_for_text', { query: tempSelObj.text })
      .then(res => {
        // l(res)
        let suggTags = []
        if(res.data.results){
          suggTags = res.data.results
        }

        this.setState({ 
          suggTags,
          tempSelObj,
          popOpen: true,
        }, () => {
          this.highlightSelection(currSel.getRangeAt(0))
          // currSel.removeAllRanges() /* Not needed because user can't copy-paste */
        })
      })
      .catch(err => {
        l(err)
      })        
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
    }, () => {
      hoverSelId = null
    })
  }

  closePopover = (e, html) => {
    // l(this.state.selTagArr, this.state.selEmoArr)
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
    }, () => {      
      tmpHtml = this.state.ceContent
      isEditing = false      
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
        let mainParent = this.contentEditable.current
        , selid = hoverEl.attr("selid")
        , elementsToRemove = $(mainParent).find(`[selid="${selid}"]`)
        , elLength = elementsToRemove.length
        
        // l("Remove these elements!", elementsToRemove, selid)

        if(elLength === 1) {
          elementsToRemove
          .replaceWith(elementsToRemove.html().replace(/\[|\]/g, ''))
        }
        else {          
          elementsToRemove.each((idx, obj) => {
            let el = $(obj)
            if(idx === 0)
              el.replaceWith(el.html().replace(/\[/g, ''))
            else if(idx === elLength - 1)
              el.replaceWith(el.html().replace(/\]/g, ''))
            else
              el.replaceWith(el.html())
          })
        }

        tmpHtml = $(this.contentEditable.current).html()
        
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

    tempSelObj.emotion = num

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
            else this.setState({ selTagArr }, this.createSelectionArea)
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
            let noCreate = !!tempSelObj.noCreate            
            delete tempSelObj.type
            delete tempSelObj.editType
            delete tempSelObj.tagArr
            delete tempSelObj.ptq
            delete tempSelObj.noCreate

            selEmoArr = this.state.selEmoArr
            selEmoArr.push(tempSelObj)
            if(noCreate) this.setState({ selEmoArr }, this.closePopover)
            else this.setState({ selEmoArr }, this.createSelectionArea)
          break;

          default: //case "edit"          
            selEmoArr = this.state.selEmoArr.map(obj => {
              if(obj.selId === tempSelObj.selId) return tempSelObj
              else return obj
            })
            this.setState({ selEmoArr }, this.closePopover)
          break;
        }
      break;     
    }
  }

  createSelectionArea = () => {
    let parent = this.contentEditable.current
    , selEl = $(parent).find(`[selid="${this.state.tempSelObj.selId}"]`)

    selEl
    .removeClass("highlight")
    .addClass("mark")

    if(selEl.length > 1){
      $(selEl[0]).html("[" + $(selEl[0]).html())
      $(selEl[selEl.length - 1]).html($(selEl[selEl.length - 1]).html() + "]")
    }else{
      selEl.html("[" + selEl.html() + "]")
    }      
    
    this.closePopover(0, $(parent).html())
  }
  
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
    // l(this.state)
    if(this.state.source.name === ""){
      // l("Sauce please")
      this.setState({ noSource: true })
    } else {      
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
      , req = {
        user_type: "content_manager",
        source: this.state.source.name,
        text: $(this.contentEditable.current).text().replace(/\[|\]/g, ''),
        pq: this.state.pq, 
        tags, emotions
      }

      l(req)
      this.http
      .post('/api/v1/submit_data', req, auth)
      .then(res => {
        l(res)
        this.setState({ 
          notifType: "submit",
          source: { name: "" },
          ceContent: ""
        })
      })
      .catch(err => l(err))
    }
  }
  
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
              <button className="btn-accent" onClick={() => this.setNotification("")} type="button">Next</button>              
              <button className="btn-accent btn-anchor" onClick={() => this.setNotification("")} type="button">Undo</button>              
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
              <div className={`ctn-text ctn-source ${this.state.noSource?"error":""}`}>
                <img src="assets/link-2.svg" alt=""/>
                <AutoComplete
                  inputProps={{
                    className: 'auto-inp source',
                    placeholder: 'Source link',
                    value: this.state.source.name
                  }}
                  type="sources"
                  optionSelected={this.sourceAdded}
                  inputChanged={this.handleSourceChange}
                  // getCurrSugg={this.handleSuggestions}
                 />
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
                  onKeyDown={this.handleKeyDown}
                  // data-autocomplete-spy
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
                        disabled={this.state.tempSelObj.emotion === 0}
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
                      {/* <img  */}
                      {/*   onClick={() => this.processPlhInput({ type: "remove" })} */}
                      {/*   className="close" */}
                      {/*   src="assets/bounds.svg" alt=" " */}
                      {/* /> */}
                    </div>                    
                  </div>
                </Popover>
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