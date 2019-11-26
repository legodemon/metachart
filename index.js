const WIDTH = 540
const HEIGHT = 350

function draw(data, ctx) {
  const values = data.map(({t, v}) => v)
  const xStep = WIDTH / 12
  const yScale = HEIGHT / Math.ceil(Math.max.apply(null, values))

  ctx.beginPath()
  ctx.lineWidth = 3;
  data.forEach(({t, v}, index) => {
    if (index === 0) {
      ctx.moveTo(index * xStep + 20, v * -yScale + HEIGHT)
    } else {
      ctx.lineTo(index * xStep + 20, v * -yScale + HEIGHT)
    }
  })
  ctx.strokeStyle = '#2196f3'
  ctx.stroke()

  ctx.strokeStyle = '#ff0000'
  ctx.fillStyle = '#ffffff'
  data.forEach(({t, v}, index) => {
    ctx.beginPath()
    ctx.arc(index * xStep + 20, v * -yScale + HEIGHT, 5, 0, 2 * Math.PI);
    ctx.stroke()
    ctx.fill()
  })
}

document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('graphic')
  const ctx = canvas.getContext('2d')

  let dataType = 'precipitation'

  const openRequest = indexedDB.open('weather', 1)

  openRequest.onupgradeneeded = () => {
    const db = openRequest.result
    db.onerror = event => console.log('Error', event.target.error)

    if (!db.objectStoreNames.contains(dataType)) {
      db.createObjectStore(dataType)

      //fetching and saving
      fetch(`data/${dataType}.json`)
        .then(response => response.json())
        .then(data => {
          const transaction = db.transaction(dataType, 'readwrite')
          const store = transaction.objectStore(dataType)
          transaction.oncomplete = () => console.log('Data sored')

          let _key = ''
          let _value = []

          data.forEach(({t, v}) => {
            const [year, month] = t.split('-')

            if (_key !== `${year}.${month}`) {
              _key = `${year}.${month}`
              _value = [v]
            } else {
              _value.push(v)
            }

            store.put(_value, _key)
          })
        })
    }
  }

  openRequest.onsuccess = () => {
    const db = openRequest.result
    const transaction = db.transaction(dataType, 'readonly')
    const store = transaction.objectStore(dataType)

    const startYear = '1880'
    const endYear = '1882'

    const clusterInterval = endYear - startYear
    const clusteredData = []
    let clusterIteration = 0

    let _data = {}

    let request = store.openCursor(IDBKeyRange.bound(startYear, endYear, true, true))

    request.onsuccess = () => {
      let cursor = request.result
      if (cursor) {
        const {key, value} = cursor

        if (clusterIteration < clusterInterval) {
          _data[key] = value
        }

        clusterIteration += 1

        if (clusterInterval === clusterIteration) {
          clusteredData.push(_data)
          _data = {}
          clusterIteration = 0
        }

        cursor.continue()
      } else {
        const tmp = clusteredData.map(cluster => {
          let averageOnCluster = {}
          let v = 0

          Object.keys(cluster).forEach(date => {
            averageOnCluster[date] = cluster[date].reduce((acc, curr) => acc + curr) / cluster[date].length
          })

          const keysOfAverageOnCluster = Object.keys(averageOnCluster)

          keysOfAverageOnCluster.forEach(date => {
            v += averageOnCluster[date]
          })

          let t = keysOfAverageOnCluster.length > 1
            ? `${keysOfAverageOnCluster[0]}-${keysOfAverageOnCluster[keysOfAverageOnCluster.length - 1]}`
            : `${keysOfAverageOnCluster[0]}`
          v = Math.fround(v / keysOfAverageOnCluster.length)

          return {t, v}
        })

        draw(tmp, ctx)
      }
    }
  }

})
