import React, { Component } from 'react'
import Autosuggest from 'react-autosuggest'
import AutosuggestHighlightParse from 'autosuggest-highlight/parse'
import HttpService from '../services/HttpService'
import { l, auth } from '../helpers/common'

// const getIndices = (str, searchStr, caseSensitive) => {
//   let searchStrLen = searchStr.length
//   if (searchStrLen === 0) {
//       return []
//   }
//   let startIndex = 0, index, indices = []
//   if (!caseSensitive) {
//     str = str.toLowerCase()
//     searchStr = searchStr.toLowerCase()
//   }
//   while ((index = str.indexOf(searchStr, startIndex)) > -1) {
//     startIndex = index + searchStrLen
//     indices.push([index, startIndex])
//   }
//   return indices
// }

export default class AutoComplete extends Component {
  constructor(props) {
    super(props)
    let value = this.props.inputProps.value
    this.http = new HttpService()
    this.state = {
      value: value ? value: "",
      suggestions: [],
    }
  }
  
  getSuggestionValue = suggestion => {
    if(this.props.type === "tag"){
      return suggestion.full_name
    }else if(this.props.type === "placeholder"){
      return suggestion.name
    }
  }
  
  renderSuggestion = (suggestion, { query }) => {
    let suggestionText
    if(this.props.type === "tag"){
      suggestionText = `${suggestion.full_name}`
    }else if(this.props.type === "placeholder"){
      suggestionText = `${suggestion.name}`    
    }

    // const parts = AutosuggestHighlightParse(suggestionText, getIndices(suggestionText, query))
    return (
      // <div>
      //   {
      //     parts.map((part, index) => {
      //       const className = part.highlight ? 'highlight' : null
      //       return (
      //         <span className={className} key={index}>{part.text}</span>
      //       )
      //     })
      //   }
      // </div>
      <div>{ suggestionText }</div>
    )
  }

  getSuggestions = value => {
    // let showAnim = true, showAttr = false
    let url, params = {
      query: value,
      series: true,
    }

    // if(this.props.changeInput)
    //   this.props.changeInput(showAnim, showAttr)

    if(this.props.type === "tag"){
      url = '/api/v1/tags'
    }else if(this.props.type === "placeholder"){
      url = '/api/v1/reviews/placeholders'
    }

    this.http
    .get(url, params, auth)
    .then(res => {
      const currRes = res.data.results
      let suggestions      
      // l("Total API Results:", currRes)

      if(this.props.type === "tag"){
        suggestions = currRes.filter(x => x.full_name.toLowerCase().includes(value.toLowerCase()))      
      }else if(this.props.type === "placeholders"){
        suggestions = currRes.filter(x => x.name.toLowerCase().includes(value.toLowerCase()))      
      }
      // l("Results containing current query:", suggestions)
      
      // showAnim = false
      // showAttr = true

      // To set filtered options 
      // this.setState({ suggestions })

      // To set all options 
      this.setState({ suggestions: currRes })

      // if(this.props.changeInput)
      //   this.props.changeInput(showAnim, showAttr)
        
      if(this.props.getCurrSugg)
        this.props.getCurrSugg(currRes)
    })
    .catch(error => {
      // error callback
      l(error)
    })
  }

  onChange = (event, { newValue }) => {
    this.setState({
      value: newValue
    })
    // if (this.props.inputChanged) this.props.inputChanged(newValue)
  }

  onSuggestionsFetchRequested = ({ value }) => {
    if(value.trim() !== "")
      this.getSuggestions(value)
  }

  onSuggestionsClearRequested = () => {
    this.setState({
      suggestions: [] 
    })
  }

  onSuggestionSelected = (event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) => {
    // l({ suggestion, suggestionValue, suggestionIndex, sectionIndex, method })
    this.props.optionSelected(suggestion, method)
    this.setState({ suggestions: [], value: "" })
    // if (this.props.type !== "label") this.setState({ value: '' })   
  }

  shouldRenderSuggestions = value => typeof value !== "undefined" && value.trim().length > 0  
  
  render() {
    const { value, suggestions } = this.state
    const inputProps = this.props.inputProps
   
    inputProps.value = value
    inputProps.onChange = this.onChange

    return (
      <div>
        <Autosuggest
          // onKeyUp={this.handleKeyUp}
          suggestions={suggestions}
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested}
          onSuggestionSelected={this.onSuggestionSelected}
          getSuggestionValue={this.getSuggestionValue}
          renderSuggestion={this.renderSuggestion}
          highlightFirstSuggestion={false}
          // highlightFirstSuggestion={this.props.type !== "label"?true:false}
          // alwaysRenderSuggestions={true}
          inputProps={inputProps}
        />
      </div>
    )
  }
}