// The stage: canvas, mouse/touch input, sprite dragging, keyboard and the
// "ask and wait" answer field (ported from scratch-gui containers/stage.jsx).

import type { VirtualMachine } from './engine'

const DRAG_THRESHOLD = 3

function eventXY(e: MouseEvent | TouchEvent) {
  if ('touches' in e && e.touches) {
    const touch = e.touches[0] || e.changedTouches[0]
    return { x: touch.clientX, y: touch.clientY }
  }
  const m = e as MouseEvent
  return { x: m.clientX, y: m.clientY }
}

export interface StageCallbacks {
  /** a sprite was dragged by hand to a new position */
  onSpriteMoved(targetId: string): void
  /** a sprite was clicked (select it for editing) */
  onSpriteSelected(targetId: string): void
}

export class StageView {
  readonly element: HTMLElement
  readonly canvas: HTMLCanvasElement
  private vm: VirtualMachine | null = null
  private renderer: any = null
  private rect: DOMRect | null = null
  private mouseDown = false
  private mouseDownPos: [number, number] | null = null
  private mouseDownTimer: number | null = null
  private dragId: string | null = null
  private dragOffset: [number, number] = [0, 0]
  private question: HTMLElement
  private questionText: HTMLElement
  private answer: HTMLInputElement
  private resizeObserver: ResizeObserver
  private callbacks: StageCallbacks

  constructor(callbacks: StageCallbacks) {
    this.callbacks = callbacks
    this.element = document.createElement('div')
    this.element.className = 'ls-stage'
    this.element.tabIndex = 0

    this.canvas = document.createElement('canvas')
    this.canvas.width = 480
    this.canvas.height = 360
    this.element.appendChild(this.canvas)

    this.question = document.createElement('div')
    this.question.className = 'ls-question'
    this.question.hidden = true
    this.questionText = document.createElement('div')
    this.answer = document.createElement('input')
    this.answer.type = 'text'
    this.question.append(this.questionText, this.answer)
    this.element.appendChild(this.question)

    this.answer.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.key === 'Enter') {
        const value = this.answer.value
        this.answer.value = ''
        this.question.hidden = true
        this.vm?.runtime.emit('ANSWER', value)
      }
    })

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.element)
  }

  attach(vm: VirtualMachine, renderer: any) {
    this.vm = vm
    this.renderer = renderer

    this.canvas.addEventListener('mousedown', this.onMouseDown)
    this.canvas.addEventListener('touchstart', this.onMouseDown, { passive: false })
    this.canvas.addEventListener('wheel', this.onWheel, { passive: true })
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mouseup', this.onMouseUp)
    document.addEventListener('touchmove', this.onMouseMove)
    document.addEventListener('touchend', this.onMouseUp)
    this.element.addEventListener('keydown', this.onKey)
    this.element.addEventListener('keyup', this.onKey)

    vm.runtime.addListener('QUESTION', this.onQuestion)
    this.resize()
  }

  private onQuestion = (question: string | null) => {
    if (question === null) {
      this.question.hidden = true
      return
    }
    this.questionText.textContent = question
    this.question.hidden = false
    setTimeout(() => this.answer.focus())
  }

  resize() {
    if (!this.renderer) return
    const { width } = this.element.getBoundingClientRect()
    if (width > 0) this.renderer.resize(width, (width * 3) / 4)
    this.renderer.draw()
  }

  private updateRect() {
    this.rect = this.canvas.getBoundingClientRect()
  }

  private scratchCoords(x: number, y: number): [number, number] {
    const [w, h] = this.renderer.getNativeSize()
    const rect = this.rect!
    return [(w / rect.width) * (x - rect.width / 2), (h / rect.height) * (y - rect.height / 2)]
  }

  private mouseData(e: MouseEvent | TouchEvent, extra: object = {}) {
    const { x, y } = eventXY(e)
    const rect = this.rect!
    return { x: x - rect.left, y: y - rect.top, canvasWidth: rect.width, canvasHeight: rect.height, ...extra }
  }

  private onMouseDown = (e: MouseEvent | TouchEvent) => {
    if (!this.vm) return
    this.updateRect()
    this.element.focus({ preventScroll: true })
    const data = this.mouseData(e, { isDown: true })
    const isTouch = typeof TouchEvent !== 'undefined' && e instanceof TouchEvent
    if (isTouch || (e as MouseEvent).button === 0) {
      this.mouseDown = true
      this.mouseDownPos = [data.x, data.y]
      this.mouseDownTimer = window.setTimeout(() => this.startDrag(data.x, data.y), 400)
    }
    this.vm.postIOData('mouse', data)
    e.preventDefault()
  }

  private onMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!this.vm || !this.rect) return
    const data = this.mouseData(e)

    if (this.mouseDown && !this.dragId && this.mouseDownPos) {
      const dist = Math.hypot(data.x - this.mouseDownPos[0], data.y - this.mouseDownPos[1])
      if (dist > DRAG_THRESHOLD) {
        this.cancelTimer()
        this.startDrag(...this.mouseDownPos)
      }
    }

    if (this.mouseDown && this.dragId) {
      const [sx, sy] = this.scratchCoords(data.x, data.y)
      this.vm.postSpriteInfo({ x: sx + this.dragOffset[0], y: -(sy + this.dragOffset[1]), force: true })
    }

    this.vm.postIOData('mouse', data)
  }

  private onMouseUp = (e: MouseEvent | TouchEvent) => {
    if (!this.vm || !this.rect) return
    this.cancelTimer()
    const wasDragged = !!this.dragId
    const data = this.mouseData(e, { isDown: false, wasDragged })
    this.mouseDown = false
    this.mouseDownPos = null

    if (this.dragId) {
      const id = this.dragId
      this.vm.stopDrag(id)
      this.dragId = null
      this.callbacks.onSpriteMoved(id)
    }
    this.vm.postIOData('mouse', data)
  }

  private onWheel = (e: WheelEvent) => {
    this.vm?.postIOData('mouseWheel', { deltaX: e.deltaX, deltaY: e.deltaY })
  }

  private cancelTimer() {
    if (this.mouseDownTimer !== null) clearTimeout(this.mouseDownTimer)
    this.mouseDownTimer = null
  }

  private startDrag(x: number, y: number) {
    const vm = this.vm
    if (!vm || this.dragId) return

    // Like the Scratch editor: every sprite can be dragged, not only draggable ones.
    const ids = vm.runtime.targets
      .filter((t: any) => !t.isStage && Number.isFinite(t.drawableID))
      .map((t: any) => t.drawableID)
    if (!ids.length) return

    const drawableId = this.renderer.pick(x, y, 1, 1, ids)
    if (drawableId === null) return
    const targetId = vm.getTargetIdForDrawableId(drawableId)
    if (targetId === null) return

    const target = vm.runtime.getTargetById(targetId)
    target.goToFront()
    const [mx, my] = this.scratchCoords(x, y)
    this.dragOffset = [target.x - mx, -(target.y + my)]
    vm.startDrag(targetId)
    this.dragId = targetId
    this.callbacks.onSpriteSelected(targetId)
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.vm || e.target !== this.element) return
    this.vm.postIOData('keyboard', { key: e.key, isDown: e.type === 'keydown' })
    // keep LiaScript from switching slides with arrow keys or space
    e.stopPropagation()
    if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault()
  }

  dispose() {
    this.resizeObserver.disconnect()
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
    document.removeEventListener('touchmove', this.onMouseMove)
    document.removeEventListener('touchend', this.onMouseUp)
    this.vm?.runtime.removeListener('QUESTION', this.onQuestion)
  }
}
