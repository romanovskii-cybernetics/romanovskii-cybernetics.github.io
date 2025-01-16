'use strict'

const app = document.querySelector('#app')
const header = document.querySelector('header')
const debugInfo = document.querySelector('.debug-info')
const lightbox = document.querySelector('#lightbox')
const lightboxImg = document.createElement('img')
lightbox.querySelector('p').appendChild(lightboxImg);
const images = []

const renderMarkdown = text => {
  app.innerHTML = marked.parse(text, { gfm: true, /* breaks: true */ })
  app.querySelectorAll('img').forEach(img => {
		images.push(img.src)
		img.addEventListener('click', toggleLightbox)
  })
}

if (location.search) {
  const pagefile = '/pages/' + (location.search.slice(1) || 'home') + '.md' 
  const xhr = new XMLHttpRequest()
  xhr.open('GET', pagefile)
  xhr.onload = () => renderMarkdown(xhr.response)
  xhr.send()
} else {
  const embeddedMarkdown = document.querySelector('script[type="text/markdown"]')
  renderMarkdown(embeddedMarkdown.innerHTML)
}

function toggleLightbox(...args) {
  lightbox.style.display = null
  lightboxImg.src = this.src
}
lightbox.onclick = () => lightbox.style.display = 'none'
window.addEventListener('keyup', e => { switch (e.key) {
  case 'Escape':
    lightbox.style.display = 'none'
    break
  case 'ArrowRight':
    if (!lightbox.style.display) {
      lightboxImg.src = images[(images.indexOf(lightboxImg.src) + 1) % images.length]
    } break
  case 'ArrowLeft':
    if (!lightbox.style.display) {
      lightboxImg.src = images[(images.indexOf(lightboxImg.src) + images.length - 1) % images.length]
    } break
}})


document.querySelectorAll('nav > *').forEach(a => {
  if (a.href === String(location)) {
    a.classList.add('active')
    document.title += ' | ' + a.textContent
  }
})

const bgCanvas = document.querySelector('canvas#bg-canvas')
const bgContext = bgCanvas.getContext('2d')

const wScale = () => window.devicePixelRatio || 1
const wWidth = () => Math.ceil(window.innerWidth * wScale())
const wHeight = () => Math.ceil(window.innerHeight * wScale())

const cScale = (value = 1) => Math.ceil(value / (window.devicePixelRatio || 1))

const alphaHex = (val, max = 255, min = 0) => Math.round(255 * Math.max(0, Math.min(1, (val - min) / (max - min)))).toString(16).padStart(2, '0')
const alphaHexInv = (val, max = 255, min = 0) => (255 - Math.round(255 * Math.max(0, Math.min(1, (val - min) / (max - min))))).toString(16).padStart(2, '0')

/**
 * @param {CanvasRenderingContext2D} ctx 
 * @param {HTMLCanvasElement} canv 
 */
const beginBgAnimation = (ctx, canv) => {
  const mouse = {
    x: 0,
    y: 0,
    connectedPoints: [],
    mouse: true,
    i: -1,
  }

  const pointDist = 200

  const populatePoints = () => [...new Array(Math.max(Math.ceil(cScale(wWidth()) * cScale(wHeight()) / 9000), 10)).fill({}).map((v,i) => ({
    x: Math.random() * cScale(canv.width),
    y: Math.random() * cScale(canv.height),
    dx: (Math.random() * 0.5 + 0.05) * (Math.random() > 0.5 ? 1 : -1),
    dy: (Math.random() * 0.5 + 0.05) * (Math.random() > 0.5 ? 1 : -1),
    connectedPoints: i % 10 === 0 ? [] : undefined,
    i: i,
  })), mouse]
  let points

  const onWindowResize = () => {
    canv.width = wWidth()
    canv.height = wHeight()
    ctx.scale(wScale(), wScale())
    points = populatePoints()
  }

  window.addEventListener('resize', onWindowResize, true)
  onWindowResize()

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX
    mouse.y = e.clientY
  }, true)

  /**
   * @param {CanvasRenderingContext2D} ctx 
   * @param {HTMLCanvasElement} canv 
   */
  const bgAnimate = (ctx, canv) => {

    ctx.clearRect(0, 0, cScale(canv.width), cScale(canv.height))

    const darkLineHeight = header.getBoundingClientRect().bottom
    ctx.fillStyle = '#1F1F1F'
    ctx.fillRect(0, 0, cScale(canv.width), darkLineHeight)

    points.forEach(p => {
      if (p.connectedPoints) {
        p.connectedPoints = []
        p.distances = []
      }

      if (p.mouse) return
      p.x += p.dx
      p.y += p.dy

      if (p.x < 0) {
        p.x = 0
        p.dx = -p.dx
      } else if (p.x > cScale(canv.width)) {
        p.x = cScale(canv.width)
        p.dx = -p.dx
      }

      if (p.y < 0) {
        p.y = 0
        p.dy = -p.dy
      } else if (p.y > cScale(canv.height)) {
        p.y = cScale(canv.height)
        p.dy = -p.dy
      }
  
      ctx.fillStyle = '#CE9178' + alphaHexInv(p.i / points.length, 1)
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI)
      ctx.fill()

    })

    points.filter(p => p.connectedPoints).forEach(point => {
      if (point.mouse && !point.x && !point.y) return
      points.forEach(p => {
        if (p.mouse && !p.x && !p.y) return
        const dist = Math.sqrt(Math.pow(p.x - point.x, 2) + Math.pow(p.y - point.y, 2))

        //if (p !== point && Math.abs(p.x - point.x) < pointDist && Math.abs(p.y - point.y) < pointDist /*&& point.connectedPoints.length < 4*/) {
        if (dist < pointDist) {
          point.connectedPoints.push(p)
          point.distances.push(dist)
        }
      })

      point.connectedPoints.forEach((p, i) => {
        const color = (p.i % 2 ? '#DCDCAA' : '#CE9178') + (point.distances[i] > (pointDist * 0.9) ? alphaHexInv(point.distances[i], pointDist, (pointDist * 0.9)) : '')
        ctx.strokeStyle = color
        ctx.fillStyle = color

        ctx.beginPath()
        ctx.moveTo(point.x, point.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
  
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
      
      ctx.strokeStyle = '#CE9178'
      ctx.fillStyle = '#CE9178'

    })

    points.filter(p => p.connectedPoints).forEach(point => {
      if (point.connectedPoints?.length) {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI)
        ctx.fill()
      }
    })
  
    requestAnimationFrame(() => bgAnimate(ctx, canv))
  }
  bgAnimate(bgContext, bgCanvas)
}

beginBgAnimation(bgContext, bgCanvas)