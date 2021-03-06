import _ from 'lodash'

// Extract data points sorted by date
let extract = ({selected, data, dates}) => {
  // Get datasets for selected paths
  return selected.map(path => {
    // Is selected path complete?
    if (path.dataset == null) return null

    let {backend, machine, benchmark, dataset} = path
    let at = [benchmark, 'datasets', dataset]
    let commits = data[backend][machine]

    let result = _.map(commits, (benchmarks, commit) => {
      let datum = _.get(benchmarks, at, null)
      if (datum == null) return null

      datum = _.clone(datum)
      datum.commit = commit
      datum.x = new Date(dates[commit].date)
      datum.y = datum.avg

      delete datum.avg
      return datum
    })
    .filter(d => d != null)
    .sort((a, b) => a.x - b.x)

    // Don't bother w/ empty arrays
    return _.isEmpty(result) ? null : result
  })
}

// Convert to slowdown data
let slowdown = (datasets) => {
  return datasets.map(dataset => {
    if (dataset == null) return null

    let y_min = _.minBy(dataset, d => d.y).y
    for (let datum of dataset) {
      datum.stdDev /= y_min
      datum.y /= y_min
    }

    return dataset
  })
}

export {extract, slowdown}
