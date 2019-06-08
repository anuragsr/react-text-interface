import React, { Component } from 'react'
import { Slider, Rail, Handles, Tracks } from 'react-compound-slider'

import { l } from '../helpers/common'

const Track = ({ source, target, getTrackProps }) => { // Track component  
  return (
    <div 
      className="slider-track"
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

  render() {
    return (
      <div
        className={this.props.className}
        style={this.props.style}
        >
        <div className="sl-title">
          <div>{this.props.title}</div>
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