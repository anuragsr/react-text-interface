import React, { Component } from 'react'
import ContentEditable from 'react-contenteditable'
import rangy from 'rangy'
import 'rangy/lib/rangy-classapplier'

import Popover from 'react-text-selection-popover'
import placeRightBelow from 'react-text-selection-popover/lib/placeRightBelow'
import $ from 'jquery'

import AutoComplete from './AutoComplete'
import Tags from './Tags'
import SliderX from './Slider'
import HttpService from '../services/HttpService'
import { l, cl, auth, rand, sp } from '../helpers/common'

let tmpHtml
, currSelObj
, currElGroup
, hoverSelId
, isSelecting = false
, isEditing = false

export default class ManagerContent extends Component {
  constructor(props){
    super(props)
    // l(this.props)
    rangy.init()
    this.contentEditable = React.createRef()
    this.popRef = React.createRef()
    this.http = new HttpService()
    this.state = {
      name: "Yulia",
      username: "yulia@mail.ru",
      showGreeting: false,
      ceContent: "Inserting at a specific index (rather than, say, at the first space character) has to use string slicing/substring: this text is a sample. Inserting at a specific index (rather than, say, at the first space character) has to use string slicing/substring: this text is a sample",
      popPos: "up",
      popOpen: false,
      popType: "",
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
      tagStep: 1,
    }
  }

  componentDidMount(){
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
    l("updated")
    // this.positionHoverPopover()
  }

  positionHoverPopover = () => {
    // if(currElGroup){      
    // }
    let pop = $(this.popRef.current)
    , pos = currElGroup.eq(0).position()
    , width = currElGroup.eq(0).width()

    pop.css({
      display: "block",
      left: pos.left + width / 2 - pop.width() / 2, 
      top: pos.top - 50, // May include height later
    })
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
      
      this.setState({
        hoverTagArr: selTagArr.length ? selTagArr[0].tagArr: [],
        hoverEmo: selEmoArr.length ? selEmoArr[0].emotion : 0
      }, () => {

        // Applying highlight to all matched, so it looks like a group
        currElGroup = $(mainParent).find(`[selid="${selid}"]`)
        currElGroup.addClass("highlight")     

        // Showing popup on hover
        this.positionHoverPopover()
      })
    }
  }

  hideHoverPopover = () => {
    if(currElGroup){
      currElGroup.removeClass("highlight")
      currElGroup = null        
    }

    let pop = $(this.popRef.current)
    pop.css({
      display: "none"
    })
  }

  hideGreeting = () => this.setState({ showGreeting: false })
  
  logout = () => this.props.logout()
  
  handleInputChange = event => {
    const target = event.target
    const value = target.value
    this.setState({
      [target.name]: value
    })
  }

  handleCeChange = evt => {
    let val = evt.target.value
    if(val === "<br>" || val === "<div><br></div>") val = ""
    this.setState({ ceContent: val })
  }

  handlePaste = e => {
    e.preventDefault()
    document.execCommand('insertHTML', false, e.clipboardData.getData('text/plain'))
  }

  handleMouseMove = e => isSelecting = rangy.getSelection().toString().length > 0

  handleMouseDownOutside = e => {
    l("Mouse Down outside")
    this.closePopover(0, tmpHtml)
  }

  handleMouseDown = e => {
    l("Mouse Down on contenteditable")
    sp(e)
    this.closePopover(0, tmpHtml)
  }

  handleMouseUp = e => {
    // Preserving html in case no tags added
    let parent = this.contentEditable.current
    tmpHtml = $(parent).html()
    l(tmpHtml)

    let currSel = rangy.getSelection()
    , selText = currSel.toString()
    , selTagArr = this.state.selTagArr

    if(selText.length){
      let tempSelObj = this.state.tempSelObj      
      tempSelObj.selId =  rand(5)
      tempSelObj.text  =  selText.replace(/\[|\]/g, '')
      tempSelObj.start =  currSel.anchorOffset
      tempSelObj.end   =  currSel.focusOffset - 1

      this.setState({ 
        tempSelObj,
        popOpen: true,
      }, () => {
        this.highlightSelection(currSel.getRangeAt(0))
        currSel.removeAllRanges()
      })
    }
  }

  highlightSelection = sel => {
    let selid = this.state.tempSelObj.selId   
    rangy
    .createClassApplier('highlight', { elementAttributes: { selid: selid } })
    .applyToSelection()    
  }

  closePopover = (e, html) => {
    l(this.state.selTagArr, this.state.selEmoArr)
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

  openPopover = options => {
    l(hoverSelId, options)
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

        case "emoji":
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

  tagAdded = tag => {
    let tempSelObj = this.state.tempSelObj
    tempSelObj.tagArr.push(tag)
    
    this.setState({ tagStep: 2, tempSelObj })
  }

  tagRemoved = tag => {
    let tempSelObj, hoverTagArr

    if(hoverSelId) tempSelObj = this.state.selTagArr.filter(s => s.selId === hoverSelId)[0]      
    else tempSelObj = this.state.tempSelObj

    hoverTagArr = tempSelObj.tagArr.filter(s => s.id !== tag.id)
    tempSelObj.tagArr = hoverTagArr

    if(hoverTagArr.length) this.setState({ tempSelObj, hoverTagArr }) 
    else this.setState({ tempSelObj, hoverTagArr, tagStep: 1 })
  }

  addMoreTags = () => {
    this.setState({ tagStep: 1 })
  }

  PTQChanged = val => {
    let tempSelObj = this.state.tempSelObj
    tempSelObj.ptq = val
    this.setState({ tempSelObj })
  }
  
  selectEmoji = num => {
    let tempSelObj, hoverEmo

    if(hoverSelId) tempSelObj = this.state.selEmoArr.filter(s => s.selId === hoverSelId)[0]      
    else tempSelObj = this.state.tempSelObj

    tempSelObj.emotion = num
    // hoverEmo = num

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

          case "edit": 
            selTagArr = this.state.selTagArr.map(obj => {
              if(obj.selId === tempSelObj.selId) return tempSelObj
              else return obj
            })
            this.setState({ selTagArr }, this.closePopover)  
          break;
        }
      break;

      case "emoji": 
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

          case "edit": 
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

  submit = e => {
    sp(e)
    l(this.state.ceContent)
  }
  
  render(){
    const customStrategy = ({
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
      const style = { position: "fixed" }
      style.left = selectionLeft + (selectionWidth / 2) - (boxWidth / 2)
      style.top = selectionTop - boxHeight - gap

      if (style.left < frameLeft) {
        style.left = frameLeft
      } else if (style.left + boxWidth > frameWidth) {
        style.left = frameWidth - boxWidth
      }
     
      if (style.top < frameTop || this.state.popPos === "down") { // Switch for up/down
        style.top = selectionTop + selectionHeight + gap
      }

      return style
    }

    let popoverClass = "ctn-pop-outer"    
    if(this.state.popPos === "up") popoverClass+= " arrow-bottom"
    else popoverClass+= " arrow-top"

    let hoverEmoImg = null
    if(this.state.hoverEmo > 0) {
      switch(this.state.hoverEmo){
        case 1: hoverEmoImg = "assets/emo-1.svg"; break;
        case 2: hoverEmoImg = "assets/emo-2.svg"; break;
        case 3: hoverEmoImg = "assets/emo-3.svg"; break;
        case 4: hoverEmoImg = "assets/emo-4.svg"; break;
        case 5: hoverEmoImg = "assets/emo-5.svg"; break;
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
          {this.state.showGreeting && <div className="greeting-outer">
            <div className="greeting-inner">
              <img src="assets/sun.svg" alt=""/>
              <div className="title">                
                Hey {this.state.name}! Let's add some texts today!
              </div>
              <button className="btn-accent" onClick={this.hideGreeting} type="button">Let's go</button>
              <div className="txt-rem">Texts remaining 15/15</div>
            </div>
          </div>}
          {!this.state.showGreeting && <div className="content-outer">
            <div className="container">
              <div className="ctn-text ctn-source">
                <img src="assets/link-2.svg" alt=""/>
                <input type="text" placeholder="Source link"/>
              </div>
              <div className="ctn-text ctn-text-main">
                <img className="plh" src="assets/align-left.svg" alt=""/>

                <ContentEditable
                  placeholder={"Add some text and tags .."}
                  className="ctn-text-content"
                  innerRef={this.contentEditable}
                  html={this.state.ceContent} // innerHTML of the editable div                  
                  onChange={this.handleCeChange} // handle innerHTML change
                  onMouseMove={this.handleMouseMove}
                  onMouseDown={this.handleMouseDown}
                  onMouseUp={this.handleMouseUp}
                  onPaste={this.handlePaste}
                />

                <Popover
                  isOpen={this.state.popOpen}
                  selectionRef={this.contentEditable}
                  placementStrategy={customStrategy}
                >
                  <div className={popoverClass} onMouseDown={sp}>
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
                          <SliderX ptq={this.state.tempSelObj.ptq} changePTQ={this.PTQChanged} />                          
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
                            className={"emo-single " + (this.state.tempSelObj.emotion === 1?"active":"")} 
                            onClick={() => this.selectEmoji(1)}
                          >
                            <img src="assets/emo-1.svg" alt=" " className="clr"/>
                            <img src="assets/emo-1-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={"emo-single " + (this.state.tempSelObj.emotion === 2?"active":"")} 
                            onClick={() => this.selectEmoji(2)}
                          >
                            <img src="assets/emo-2.svg" alt=" " className="clr"/>
                            <img src="assets/emo-2-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={"emo-single " + (this.state.tempSelObj.emotion === 3?"active":"")} 
                            onClick={() => this.selectEmoji(3)}
                          >
                            <img src="assets/emo-3.svg" alt=" " className="clr"/>
                            <img src="assets/emo-3-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={"emo-single " + (this.state.tempSelObj.emotion === 4?"active":"")} 
                            onClick={() => this.selectEmoji(4)}
                          >
                            <img src="assets/emo-4.svg" alt=" " className="clr"/>
                            <img src="assets/emo-4-grey.svg" alt=" " className="bw"/>
                          </div>
                          <div 
                            className={"emo-single " + (this.state.tempSelObj.emotion === 5?"active":"")} 
                            onClick={() => this.selectEmoji(5)}
                          >
                            <img src="assets/emo-5.svg" alt=" " className="clr"/>
                            <img src="assets/emo-5-grey.svg" alt=" " className="bw"/>
                          </div>
                        </div>
                      </div>
                      <button onClick={this.saveSelection} className="btn-accent">Submit</button>
                    </div>}

                  </div>
                </Popover>

                <div
                  ref={this.popRef}
                  className="ctn-pop-hover arrow-bottom"
                >
                  {this.state.hoverTagArr.length > 0 && <Tags 
                    tagArr={this.state.hoverTagArr} 
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
              </div>
            </div>
          </div>}

          <div className="ctn-buttons">
            <button className="btn-accent">Get random text</button>
            <button className="btn-accent" onMouseDown={this.submit}>Submit</button>
          </div>
        </div>
      </div>
    )
  }
}