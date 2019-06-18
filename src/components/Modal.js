import React, { Component } from 'react'
import $ from 'jquery'

import { l } from '../helpers/common'

const maxSize = 1024 * 1024 // 1024 Bytes (1KB) X 1024 = 1 MB

export default class Modal extends Component {
  constructor(props) {
    super(props)
    this.modal = React.createRef()
    this.dropInput = React.createRef()
    this.fileInput = React.createRef()
    this.state = { 
      dragging: false, 
      upFile: "",
      disableBtn: true,
      showErr: false
    }
  }

  componentDidMount() {
    // Modal
    $(this.modal.current).modal({ 
      show: true, 
      keyboard: false,
      backdrop: 'static'
    })
    $(this.modal.current).on('hidden.bs.modal', this.props.handleModalCloseClick)

    // Dropzone
    if(!this.props.showProgress){    
      let div = this.dropInput.current
      div.addEventListener('dragenter', this.handleDragIn)
      div.addEventListener('dragleave', this.handleDragOut)
      div.addEventListener('dragover', this.handleDrag)
      div.addEventListener('drop', this.handleDrop)
    }
  }
  
  componentWillUnmount(){
    // Dropzone
    if(!this.props.showProgress){
      let div = this.dropInput.current
      div.removeEventListener('dragenter', this.handleDragIn)
      div.removeEventListener('dragleave', this.handleDragOut)
      div.removeEventListener('dragover', this.handleDrag)
      div.removeEventListener('drop', this.handleDrop)
    }
  }

  handleCloseClick = () => {
    $(this.modal.current).modal('hide')
    this.props.handleModalCloseClick()
  }

  handleDrag = e => {
    e.preventDefault()
    e.stopPropagation()
  }

  handleDragIn = e => {
    e.preventDefault()
    e.stopPropagation()
    this.dragCounter++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      this.setState({dragging: true})
    }
  }

  handleDragOut = e => {
    e.preventDefault()
    e.stopPropagation()
    this.dragCounter--
    if (this.dragCounter === 0) {
      this.setState({dragging: false})
    }
  }

  handleDrop = e => {
    e.preventDefault()
    e.stopPropagation()
    this.setState({dragging: false})
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      this.prepareForUpload(e.dataTransfer.files)
      e.dataTransfer.clearData()
      this.dragCounter = 0
    }
  }
  
  prepareForUpload = files => {
    // l(files)
    let upFile = files[0], disableBtn = true, showErr = true
    if(
      // Size check
      upFile.size <= maxSize
      // Type check
      && (upFile.type === "audio/mp3" || upFile.type === "audio/wav") 
    ) {
      disableBtn = false
      showErr = false
    }

    this.setState({ upFile, disableBtn, showErr }) 
  }

  doUpload = () => {
    this.props.fileChosen(this.state.upFile)
    this.handleCloseClick()
  }

  render() {
    return (
      <div>
        <div className="modal fade" ref={this.modal} id="exampleModal" tabIndex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered" role="document">
            {this.props.showProgress && <div className="modal-content progress">
              <div className="bar-outer">
                <div className="bar-inner" style={{ width: `${this.props.upProgress}%` }}></div>
              </div>
            </div>}
            {!this.props.showProgress && <div className="modal-content">
              <div ref={this.dropInput} className="dropzone">
                <img src="assets/dz.svg" alt=""/>
                <span>Drag and drop</span>
                <input className="inputfile" id="file" type="file"
                  ref={this.fileInput}
                  onChange={() => this.prepareForUpload(this.fileInput.current.files)}
                />
                <div>
                  Drop any audio file or <label htmlFor="file">browse your files</label>
                </div>
              </div>
              {this.state.upFile !== "" && <div className="file-info">
                File name: {this.state.upFile.name}
              </div>}
              <div className="ctn-up-action">
                <div className={`ctn-up-msg ${this.state.showErr ? "err":""}`}>
                  <div>(*) Maximum file size 1 Mb</div>
                  <div>.mp3, .wav files only</div>
                </div>
                <button className="btn-accent" disabled={this.state.disableBtn} onClick={this.doUpload}>Upload</button>
              </div>
              <img onClick={this.handleCloseClick} className="close" src="assets/bounds.svg" alt=" "/>
            </div>}            
          </div>
        </div>
      </div>
    )
  }
}