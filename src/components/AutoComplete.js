import React, { Component } from 'react'
import Autosuggest from 'react-autosuggest'
import HttpService from '../services/HttpService'
import { l, auth } from '../helpers/common'

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
    }else if(this.props.type === "sources"){
      return suggestion.name
    }
    // else if(this.props.type === "placeholder"){
    //   return suggestion.name
    // }
  }
  
  renderSuggestion = (suggestion, { query }) => {
    let suggestionText
    if(this.props.type === "tag"){
      suggestionText = `${suggestion.full_name}`
    }else if(this.props.type === "sources"){
      suggestionText = `${suggestion.name}`    
    }
    // else if(this.props.type === "placeholder"){
    //   suggestionText = `${suggestion.name}`    
    // }

    return (
      <div>{ suggestionText }</div>
    )
  }

  getSuggestions = value => {
    let url, params = {
      query: value,
      series: true,
    }

    if(this.props.type === "tag"){
      url = '/api/v1/tags'
    }else if(this.props.type === "sources"){
      url = '/api/v1/sources'
    }
    // else if(this.props.type === "placeholder"){
    //   // url = '/api/v1/reviews/placeholders'
    //   url = '/api/v1/suggested_tag_for_text'
    // }

    this.http
    .get(url, params, auth)
    .then(res => {
      const currRes = res.data.results
      let suggestions      
      l("Total API Results:", currRes)

      if(this.props.type === "tag"){
        suggestions = currRes.filter(x => x.full_name.toLowerCase().includes(value.toLowerCase()))      
      }else if(this.props.type === "sources"){
        suggestions = currRes.filter(x => x.name.toLowerCase().includes(value.toLowerCase()))      
      }
      // else if(this.props.type === "placeholder"){
      //   suggestions = currRes.filter(x => x.name.toLowerCase().includes(value.toLowerCase()))      
      // }
      l("Results containing current query:", suggestions)

      // To set filtered options 
      // this.setState({ suggestions })

      // To set all options 
      this.setState({ suggestions: currRes })
        
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
    if (this.props.inputChanged) this.props.inputChanged(newValue)
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
    this.setState({ suggestions: [] })
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
          suggestions={suggestions}
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested}
          onSuggestionSelected={this.onSuggestionSelected}
          getSuggestionValue={this.getSuggestionValue}
          renderSuggestion={this.renderSuggestion}
          highlightFirstSuggestion={false}
          inputProps={inputProps}
        />
      </div>
    )
  }
}