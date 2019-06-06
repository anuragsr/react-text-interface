import React, { Component } from 'react'
import ContentEditable from 'react-contenteditable'
import rangy from 'rangy'
import 'rangy/lib/rangy-classapplier'
// import 'rangy/lib/rangy-highlighter'
// import 'rangy/lib/rangy-selectionsaverestore'
import 'rangy/lib/rangy-serializer'

import Popover from 'react-text-selection-popover'
import placeRightBelow from 'react-text-selection-popover/lib/placeRightBelow'
import $ from 'jquery'

import AutoComplete from './AutoComplete'
import Tags from './Tags'
import SliderX from './Slider'
import HttpService from '../services/HttpService'
import { l, cl, auth, rand, trimSpaces } from '../helpers/common'

let tmpHtml
, currSelObj
, currElGroup

export default class ManagerContent extends Component {
  constructor(props){
    super(props)
    // l(this.props)
    rangy.init()
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
      selArr: [],
      tempSelObj: { ptq: 0, tagArr: [] },
      tagStep: 1
    }
    this.contentEditable = React.createRef()
  }

  componentDidMount(){
    $(document).on("mouseenter", ".mark", e => {
      let el = $(e.target)
      , parent = el.parent()
      
      while(parent.hasClass("mark")){
        el = parent
        parent = parent.parent()
      }

      l(el, el.attr("selid"))

      let selid = el.attr("selid")
      , mainParent = this.contentEditable.current
      
      currElGroup = $(parent).find(`[selid="${selid}"]`)

      currElGroup.addClass("highlight")

      // l(isSelecting)
      // if(!isSelecting)  
      //   this.setState({ popOpen: true })
    })

    $(document).on("mouseleave", ".mark", e => {
      // l(e)
      if(currElGroup){
        currElGroup.removeClass("highlight")
        currElGroup = null        
      }
      // this.setState({ popOpen: false })
    })
  }

  sp = e => e && e.stopPropagation()

  handleInputChange = event => {
    const target = event.target
    const value = target.value
    this.setState({
      [target.name]: value
    })
  }

  hideGreeting = () => this.setState({ showGreeting: false })
  
  logout = () => this.props.logout()
  
  handleCeChange = evt => {
    // l(evt.target.value)
    let val = evt.target.value
    if(val === "<br>" || val === "<div><br></div>") val = ""
    this.setState({ ceContent: val })
  }

  handleMouseDownOutside = e => {
    l("Mouse Down outside")
    this.closePopover(0, tmpHtml)
  }

  handleMouseDown = e => {
    l("Mouse Down on contenteditable")
    this.sp(e)
    this.closePopover()
  }

  closePopover = (e, html) => {
    l(this.state.selArr)
    this.setState({ 
      popOpen: false, 
      tagStep: 1,
      popPos: "up",
      popType: "",
      ceContent: html ? html : this.state.ceContent,
      tempSelObj: { ptq: 0, tagArr: [] }
    })
  }

  handleMouseUp = e => {
    // Preserving html in case no tags added
    let parent = this.contentEditable.current
    tmpHtml = $(parent).html()
    // l(tmpHtml)

    let currSel = rangy.getSelection()
    , selText = currSel.toString()
    , selArr = this.state.selArr

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

  highlightSelection = userSelection => {
    let applier = rangy.createClassApplier('highlight', {
      elementAttributes: { selid: this.state.tempSelObj.selId },      
    })

    applier.applyToSelection()
  }

  handlePaste = e => {
    e.preventDefault()
    document.execCommand('insertHTML', false, e.clipboardData.getData('text/plain'))
  }

  selectPopType = popType => {
    this.setState({ popPos: "down", popType })
  }

  tagAdded = tag => {
    let tempSelObj = this.state.tempSelObj
    tempSelObj.tagArr.push(tag)
    
    this.setState({ tagStep: 2, tempSelObj })
  }

  tagRemoved = tag => {
    let tempSelObj = this.state.tempSelObj
    tempSelObj.tagArr = tempSelObj.tagArr.filter(s => s.id !== tag.id)

    if(tempSelObj.tagArr.length) this.setState({ tempSelObj }) 
    else this.setState({ tempSelObj, tagStep: 1 })
  }

  addMoreTags = () =>{
    this.setState({ tagStep: 1 })
  }

  PTQChanged = val => {
    let tempSelObj = this.state.tempSelObj
    tempSelObj.ptq = val
    this.setState({ tempSelObj })
  }
  
  saveSelection = () => {    
    let parent = this.contentEditable.current
    , selEl = $(parent).find(`[selid="${this.state.tempSelObj.selId}"]`)
    , selArr = this.state.selArr
    , tempSelObj = this.state.tempSelObj

    selArr.push(tempSelObj)

    this.setState({ 
      selArr, 
      // tempSelObj: { ptq: 0, tagArr: [] } 
    }, () => {      
      // l(selEl)
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
    })
  }

  submit = e => {
    this.sp(e)
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

    let popoverClass = "ctn-pop"    
    if(this.state.popPos === "up") popoverClass+= " arrow-bottom"
    else popoverClass+= " arrow-top"

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
                {/* <p ref={this.popRef}>This text will trigger the popover</p> */}
                {/* <Popover selectionRef={this.popRef}> */}
                {/*   <div className="ctn-pop arrow-bottom"> */}
                {/*     Hello */}
                {/*   </div> */}
                {/* </Popover> */}

                <ContentEditable
                  placeholder={"Add some text and tags .."}
                  className="ctn-text-content"
                  innerRef={this.contentEditable}
                  html={this.state.ceContent} // innerHTML of the editable div                  
                  onChange={this.handleCeChange} // handle innerHTML change
                  onMouseDown={this.handleMouseDown}
                  onMouseUp={this.handleMouseUp}
                  onPaste={this.handlePaste}
                />
                <Popover
                  isOpen={this.state.popOpen}
                  selectionRef={this.contentEditable}
                  placementStrategy={customStrategy}
                >
                  <div className={popoverClass} onMouseDown={this.sp}>
                    {this.state.popType === "" && <div className="ctn-btn-empty">
                      <img onClick={() => this.selectPopType("tag")} src="assets/tag-white.svg" alt=" "/>
                      <img onClick={() => this.selectPopType("emoji")} src="assets/emoji.svg" alt=" "/>
                    </div>}

                    {this.state.popType === "tag" && <div className="ctn-tag">
                      
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

                    {this.state.popType === "emoji" && <div>
                      emoji
                    </div>}

                  </div>
                </Popover>               
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