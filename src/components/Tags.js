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
    let arr = item.split(":")
    , length = arr.length
    , ret = [arr[length - 2], arr[length - 1]].join(":") 
    , mainLength = this.state.items.length
    
    if(i === mainLength - 1 && typeof this.props.ptq !== "undefined")
      ret+= `, PTQ: ${this.props.ptq}`

    return ret
  }

  handleRemove = item => {
    this.props.removeTag(item)
  }

  render(){
    return (
      <ul className="tag-ctn" style={this.props.style}>
        {this.state.items.map((item, i) => {
          let currImg = item.image !== null ? item.image : "assets/tag-plh.png"
          return (
            <li key={i}>
              <div>
                <img className="tag-img"src={currImg} alt="" />
                <span className="tag-name">{this.getDisplayName(item.full_name, i)}</span>
                <img className="del-tag" onClick={() => this.handleRemove(item)} src="assets/delete-tag-black.svg" alt="" />              
              </div>
            </li>
          )
        })}
        <li className="last">
          <img onClick={this.props.addMoreTags} src="assets/plus.svg" alt=""/>
        </li>
      </ul>
    )
  }
}