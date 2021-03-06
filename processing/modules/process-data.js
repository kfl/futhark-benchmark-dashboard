const fs = require('fs')
var _ = require('lodash')

// Average of array
const average = (data) => data.reduce((sum, value) => sum + value, 0) / data.length

// Standard Deviation of array
const standardDeviation = (values) => {
  const avg = average(values)
  return Math.sqrt(average(values.map((value) => {
    const diff = value - avg
    return diff * diff
  })))
}

// Processes benchmark files
const processData = ({files, commitData, benchmarkResultsFolder, settings}) => {
  const combined = {}
  const metadata = {
    skeleton: {},
    commits: commitData,
    benchmarks: {}
  }

  for (const file of files) {
    // Grab benchmark information from filename
    const [backend, machine, commit] = file.replace('.json', '').split('-').splice(1)

    // Don't include the benchmark run if we couldn't find it's date
    if (!(commit in commitData)) {
      continue
    }

    // Don't include the benchmark run if it's not whitelisted
    if (!_.has(settings, ['whitelist', backend, machine])) {
      continue
    }

    // Load and parse the benchmark file (from disk)
    const data = JSON.parse(fs.readFileSync(`${benchmarkResultsFolder}/${file}`))

    // For each individual benchmark in the file
    for (const benchmarkKey in data) {
      const benchmark = data[benchmarkKey]
      const {datasets} = benchmark

      // Don't include the benchmark if it has no datasets
      if (datasets == null || Object.keys(datasets).length === 0) {
        continue
      }

      // For each dataset in the benchmark
      for (const datasetKey in datasets) {
        const dataset = datasets[datasetKey]
        const {runtimes} = dataset

        // Don't include the dataset data, if no runtimes are found
        if (runtimes == null) {
          continue
        }

        // Update the metadata with the current benchmark/dataset combination
        if (!_.has(metadata.benchmarks, [benchmarkKey])) {
          _.set(metadata.benchmarks, [benchmarkKey], [])
        }
        _.get(metadata.benchmarks, [benchmarkKey], []).push(datasetKey)

        // Insert the avg. and stddev. of the dataset into the output
        _.set(combined, [backend, machine, commit, benchmarkKey, 'datasets', datasetKey], {
          avg: Math.round(average(runtimes)),
          stdDev: Math.round(standardDeviation(runtimes))
        })
      }
    }

    // Update the metadata with the current backend/machine combination
    _.set(metadata.skeleton, [backend, machine], {})
  }

  // Deduplicate the datasets of the benchmarks in the metadata
  metadata.benchmarks = _.mapValues(metadata.benchmarks, datasets => _.uniq(datasets))

  return {combined, metadata}
}

module.exports = {average, standardDeviation, processData}
