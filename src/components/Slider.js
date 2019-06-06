import React, { Component } from 'react'
import { Slider, Rail, Handles, Tracks } from 'react-compound-slider'

import { l } from '../helpers/common'

const Track = ({ source, target, getTrackProps }) => { // Track component

  // const getStyle = source => {
  //   let ret = {}
  //   if(source.id === '$$-0'){
  //     if(source.value < 0){
  //       ret.left = `${source.percent}%`
  //       ret.width = `${50 - source.percent}%`
  //       ret.backgroundColor = '#ff4c43'
  //     } else{
  //       ret.left = `${50}%`
  //       ret.width = `${source.percent - 50}%`
  //       ret.backgroundColor = '#56d86c'
  //     }
  //   }
  //   return ret
  // }

  return (
    <div 
      className="slider-track"
      // style={getStyle(source)}  
      style={{
         left: `${source.percent}%`,
         width: `${target.percent - source.percent}%`,
       }}
      {...getTrackProps()}
    />
  )
}

const Handle = ({ handle: { id, percent }, getHandleProps }) => { // Handle component
  return (
    <div
      className="slider-handle"
      style={{ left: `${percent}%` }}
      {...getHandleProps(id)}
    />
  )
}

// let rangeValues = [0]

export default class SliderX extends Component {
  constructor(props) {
    super(props)
    this.state = { ptq: this.props.ptq }
  }
  
  componentWillReceiveProps = nextProps => {
    this.setState({ ptq: nextProps.ptq })
  }

  onSliderChange = value => {
    let val = value[0]
    this.setState({ ptq: val }, this.props.changePTQ(val))
  }

  resetAttr = () => this.onSliderChange([this.state.ptq])

  render() {
    return (
      <div>
        <div className="sl-title">
          <div>Choose PTQ (Place-tag Quality)</div>
          <div>{this.state.ptq}</div>
        </div>
        <Slider
          className="slider-outer"
          domain={[0, 100]}
          step={10}
          mode={2}
          values={[this.state.ptq]}
          onUpdate={this.onSliderChange}
        >
          <Rail>
            {({ getRailProps }) => (  // adding the rail props sets up events on the rail
              <div className="slider-rail" {...getRailProps()}/>              
            )}
          </Rail>
          <Handles>
            {({ handles, getHandleProps }) => (
              <div className="slider-handles">
                {handles.map(handle => (
                  <Handle
                    key={handle.id}
                    handle={handle}
                    getHandleProps={getHandleProps}
                  />
                ))}
              </div>
            )}
          </Handles>
          <Tracks right={false}>
            {({ tracks, getTrackProps  }) => (
              <div className="slider-tracks">
                {tracks.map(({ id, source, target }) => (
                  <Track
                    key={id}
                    source={source}
                    target={target}
                    getTrackProps ={getTrackProps}                    
                  />
                ))}
              </div>
            )}
          </Tracks>
        </Slider>
      </div>
    )
  }
}