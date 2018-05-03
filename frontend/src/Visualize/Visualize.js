import React, { Component } from 'react'
import {
  Row,
  Col,
  Switch,
  Slider,
  InputNumber,
  Spin
} from 'antd'
import Path from '../Path'
import Graph from '../Graph/Graph'
import axios from 'axios'
import _ from 'lodash'

class Visualize extends Component {
  constructor(props) {
    super(props)
    this.state = {
      skeleton: null,
      benchmarks: null,
      selected: [
        {
          backend: 'opencl',
          machine: 'GTX780',
          benchmark: "futhark-benchmarks/misc/radix_sort/radix_sort.fut",
          dataset: 'data/radix_sort_100.in'
        },
        {
          backend: 'opencl',
          machine: 'GTX780',
          benchmark: "futhark-benchmarks/misc/radix_sort/radix_sort.fut",
          dataset: '#0'
        }
      ],
      commits: [],
      graphType: "speedup",
      speedUpMax: 2,
      speedUpType: "average"
    }

    this.changeBackend = this.changeBackend.bind(this)
    this.changeMachine = this.changeMachine.bind(this)
    this.changeBenchmark = this.changeBenchmark.bind(this)
    this.changeDataset = this.changeDataset.bind(this)
    this.changeGraphType = this.changeGraphType.bind(this)
    this.onSpeedupMaxChange = this.onSpeedupMaxChange.bind(this)
    this.onChangeSpeedUpType = this.onChangeSpeedUpType.bind(this)
    this.onAddPath = this.onAddPath.bind(this)
    this.onRemovePath = this.onRemovePath.bind(this)
    this.addAllDatasets = this.addAllDatasets.bind(this)
  }

  componentDidMount() {
    axios(`${process.env.REACT_APP_DATA_URL || 'http://localhost:8080'}/metadata.json`, {
      mode: "cors"
    })
    .then(response => {
      const parsed = response.data
      this.setState({
        benchmarks: parsed.benchmarks,
        skeleton: parsed.skeleton,
        commits: parsed.commits,
      })
    })
    .catch(console.error)
  }

  onChangeSpeedUpType(value) {
    this.setState({
      speedUpType: value ? 'minimum' : 'average'
    })
  }

  onSpeedupMaxChange(speedUpMax) {
    this.setState({
      speedUpMax
    })
  }
  
  changeGraphType(value) {
    this.setState({
      graphType: value ? 'speedup' : 'absolute'
    })
  }

  addAllDatasets(path, index) {
    const {benchmarks, selected} = this.state;

    const selectionExists = toCheck => selected.find(element => _.isEqual(Object.values(element), Object.values(toCheck)) )

    if ( benchmarks[path.benchmark] !== null ) {
      for ( let dataset of benchmarks[path.benchmark] ) {
        if ( path.dataset !== dataset && ! selectionExists(Object.assign({}, path, {dataset}))  ) {
          selected.push(Object.assign({}, path, {dataset}))
        }
      }

      if ( path.dataset === null ) {
        this.onRemovePath(index)
      }

      this.setState({
        selected
      })
    }
  }

  onAddPath() {
    const {selected} = this.state

    selected.push({
      backend: null,
      machine: null,
      benchmark: null,
      dataset: null
    })
    this.setState({
      selected
    })
  }

  onRemovePath(index) {
    const {selected} = this.state

    selected.splice(index, 1)
    this.setState({
      selected
    })
  }

  changeMachine(index, machine) {
    const {selected} = this.state
    selected[index] = _.merge(selected[index], {
      machine
    })
    this.setState(selected)
  }

  changeDataset(index, dataset) {
    const {selected} = this.state
    selected[index] = _.merge(selected[index], {
      dataset
    })
    this.setState(selected)
  }

  changeBenchmark(index, benchmark) {
    const {selected} = this.state
    selected[index] = _.merge(selected[index], {
      dataset: null,
      benchmark
    })
    this.setState(selected)
  }

  changeBackend(index, backend) {
    const {selected} = this.state
    selected[index] = _.merge(selected[index], {
      backend
    })
    this.setState(selected)
    this.checkInput(index)
  }

  downloadData() {
    const {selected, skeleton} = this.state

    for ( let pathIndex in selected ) {
      const path = selected[pathIndex]
      const {backend, machine} = path
      if (
        skeleton !== null &&
        backend !== null &&
        machine !== null &&
        _.get(skeleton, [backend, machine]) &&
        Object.keys(skeleton[backend][machine]).length === 0
      ) {
        axios(`${process.env.REACT_APP_DATA_URL || 'http://localhost:8080'}/data-split/${backend}/${machine}.json`, {
          mode: "cors"
        })
        .then(response => {
          const parsed = response.data
          skeleton[backend][machine] = parsed
          this.setState({
            skeleton: skeleton
          })
          this.checkInput(pathIndex)
        })
        .catch(console.error)
      }
    }
  }

  checkInput(pathIndex) {
    const {selected, skeleton, benchmarks} = this.state
    let path = selected[pathIndex]
    let {backend, machine, benchmark, dataset} = path

    if ( [backend, machine, benchmark, dataset].every(e => e === null) ) {
      if ( selected.length > 1 ) this.onRemovePath(pathIndex)
        return
    }

    if ( ! _.get(benchmarks, [benchmark]) )
      benchmark = null

    if ( benchmark === null || ! benchmarks[benchmark].includes(dataset) )
      dataset = null 

    if ( ! _.get(skeleton, [backend, machine]) ) {
      machine = null
      dataset = null
      benchmark = null
    }

    if ( ! _.get(skeleton, [backend]) )
      backend = null

    const newPath = _.merge(selected[pathIndex], {
      dataset,
      benchmark,
      backend,
      machine
    })

    if ( ! _.isEqual(newPath, selected[pathIndex]) ) {
      selected[pathIndex] = newPath
      this.setState(selected)
    }
  }

  componentWillUpdate() {
    this.downloadData()
  }

  render() {
    const {
      benchmarks,
      skeleton,
      commits,
      selected,
      graphType,
      speedUpMax
    } = this.state

    if (skeleton === null) {
      return (
        <div>
          <Row>
            <Col span={4} offset={10} style={{marginTop: "calc(50vh - 20px)"}}>
              <div style={{margin: "0 auto", width: "37px"}}>
                <Spin size="large" />
              </div>
            </Col>
          </Row>
        </div>
      )
    }
    const colors = [
      "75,192,192", // Green
      "255,138,128", // Red
      "48,79,254",
      "0,105,92",
      "76,175,80",
      "238,255,65",
      "255,193,7", // Orange
      "121,85,72" // Brown
    ]

    return (
      <div>
        <Row gutter={16} style={{marginBottom: "10px"}}>
          <Col span={3}>
            <span style={{marginRight: "5px"}}>
              Absolute
            </span>
            <Switch defaultChecked onChange={this.changeGraphType} checked={this.state.graphType === "speedup"} />
            <span style={{marginLeft: "5px"}}>
              Speedup
            </span>
          </Col>
          <Col span={9}>
            { this.state.graphType === "speedup" &&
              <div>
                <span style={{position: "relative", top: "-10px", marginRight: "5px"}}>
                  Speedup max: 
                </span>
                <Slider
                  style={{
                    width: "150px",
                    display: "inline-block",
                    marginTop: "5px"
                  }}
                  min={2}
                  max={10}
                  onChange={this.onSpeedupMaxChange}
                  value={speedUpMax}
                />
                <InputNumber
                  min={2}
                  max={10}
                  style={{ 
                    marginLeft: 16,
                    position: "relative",
                    top: "-10px",
                    width: "60px"
                  }}
                  value={speedUpMax}
                  onChange={this.onSpeedupMaxChange}
                />
              </div>
            }
          </Col>
        </Row>

        { selected.map((path, index) => (
          <Path
            colors={colors}
            benchmarks={benchmarks}
            path={path}
            key={index}
            index={index}
            count={selected.length}
            skeleton={skeleton}
            changeBackend={this.changeBackend}
            changeMachine={this.changeMachine}
            changeBenchmark={this.changeBenchmark}
            changeDataset={this.changeDataset}
            onAddPath={this.onAddPath}
            onRemovePath={this.onRemovePath}
            addAllDatasets={this.addAllDatasets}
          />
        ))}

        <Graph
          colors={colors}
          commits={commits}
          skeleton={skeleton}
          selected={selected}
          speedUpMax={speedUpMax}
          graphType={graphType}
        />
      </div>
    )
  }
}

export default Visualize