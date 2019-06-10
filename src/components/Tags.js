import React, { Component } from 'react'
import { l } from '../helpers/common'

export default class Tags extends Component {
  constructor(props) {
    super(props)
    this.state = {
      items: this.props.tagArr
    }
  }

  componentWillReceiveProps = nextProps => {
    this.setState({ 
      items: nextProps.tagArr
    }) 
  }

  getDisplayName = (item, i) => {
    let ret, mainLength = this.state.items.length

    if(item.full_name){      
      let arr = item.full_name.split(":")
      , length = arr.length
      
      ret = [arr[length - 2], arr[length - 1]].join(":")

    } else ret = item.name          

    if(i === mainLength - 1 && typeof this.props.ptq !== "undefined")
      ret+= `, PTQ: ${this.props.ptq}`    

    return ret
  }

  handleRemove = item => this.props.removeTag(item)  
  
  handleClick = item => {
    if(this.props.suggestTag) this.props.suggestTag(item)  
  }

  render(){
    return (
      <ul className="tag-ctn" style={this.props.style}>
        {this.state.items.map((item, i) => {
          
          let currImg = "assets/tag-plh.png"          
          if(item.image) currImg = item.image
          else if(item.image_url) currImg = item.image_url

          return (
            <li 
              style={{
                cursor: this.props.isSuggested ? "pointer" : "default"  
              }}
              onClick={() => this.handleClick(item)} key={i}>
              <div>
                <img className="tag-img"src={currImg} alt="" />
                {this.props.isSuggested && <span className="tag-name">{item.name}</span>}
                {!this.props.isSuggested && <span className="tag-name">{this.getDisplayName(item, i)}</span>}
                {!this.props.isSuggested && <img className="del-tag" onClick={() => this.handleRemove(item)} src="assets/delete-tag-black.svg" alt="" />}
              </div>
            </li>
          )
        })}

        {!this.props.isSuggested && <li className="last">
          <img onClick={this.props.addMoreTags} src="assets/plus.svg" alt=""/>
        </li>}
      </ul>
    )
  }
}