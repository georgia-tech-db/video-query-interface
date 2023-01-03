import { useStateDesigner } from '@state-designer/react'
import {
  Renderer,
  TLBounds,
  TLKeyboardEventHandler,
  TLPinchEventHandler,
  TLPointerEventHandler,
  TLPointerInfo,
  TLShapeBlurHandler,
  TLWheelEventHandler,
} from '@tldraw/core'
import { Bounds } from '@tldraw/core/src/components/Bounds'
import { Button, Drawer } from 'antd'
import * as React from 'react'
import { Api } from 'state/api'
import styled from 'stitches.config'
import Gantt2 from './components/Gantt2/Gantt2'
import { TitleLinks } from './components/TitleLinks'
import { Toolbar } from './components/Toolbar'
import { shapeUtils } from './shapes'
import { machine } from './state/machine'
import './styles.css'

declare const window: Window & { api: Api }

type mappingProps = Record<
  string,
  {
    point?: number[]
    time?: string
    startTime?: number
    endTime?: number
    break?: boolean
  }[]
>

interface map {
  [U: string]: object
}

let flag = false // Record Switch
let hasDragObject = false
let startTime = new Date().getTime()

let prevTrackTime = 0

function debounce(fn: (...args: any[]) => void, delay = 500) {
  let time: number | null = null

  function _debounce(...args: any[]) {
    if (time !== null) {
      clearTimeout(time)
    }

    time = setTimeout(() => {
      fn(...args)
    }, delay)
  }
  return _debounce
}

const onHoverShape: TLPointerEventHandler = (info, e) => {
  machine.send('HOVERED_SHAPE', info)
}

const onUnhoverShape: TLPointerEventHandler = (info, e) => {
  flag = false
  // startTime = new Date().getTime()
  machine.send('UNHOVERED_SHAPE', info)
}

const onPointShape: TLPointerEventHandler = (info, e) => {
  flag = true
  machine.send('POINTED_SHAPE', info)
  startTime = new Date().getTime()
  console.log('onPointShape')
}

const onPointCanvas: TLPointerEventHandler = (info, e) => {
  machine.send('POINTED_CANVAS', info)
}

const onPointBounds: TLPointerEventHandler = (info, e) => {
  flag = true
  machine.send('POINTED_BOUNDS', info)
  startTime = new Date().getTime()
  console.log('onPointBounds')
}

const onPointHandle: TLPointerEventHandler = (info, e) => {
  machine.send('POINTED_HANDLE', info)
}

const onPointerDown: TLPointerEventHandler = (info, e) => {
  machine.send('STARTED_POINTING', info)
}

const onPointerMove: TLPointerEventHandler = (info, e) => {
  machine.send('MOVED_POINTER', info)
}

const onPan: TLWheelEventHandler = (info, e) => {
  machine.send('PANNED', info)
}

const onPinchStart: TLPinchEventHandler = (info, e) => {
  machine.send('STARTED_PINCHING', info)
}

const onPinch: TLPinchEventHandler = (info, e) => {
  machine.send('PINCHED', info)
}

const onPinchEnd: TLPinchEventHandler = (info, e) => {
  machine.send('STOPPED_PINCHING', info)
}

const onPointBoundsHandle: TLPinchEventHandler = (info, e) => {
  machine.send('POINTED_BOUNDS_HANDLE', info)
}

const onBoundsChange = (bounds: TLBounds) => {
  machine.send('RESIZED', { bounds })
}

const onKeyDown: TLKeyboardEventHandler = (key, info, e) => {
  switch (key) {
    case 'Alt':
    case 'Meta':
    case 'Control':
    case 'Shift': {
      machine.send('TOGGLED_MODIFIER', info)
      break
    }
    case 'Backspace': {
      machine.send('DELETED', info)
      break
    }
    case 'Escape': {
      machine.send('CANCELLED', info)
      break
    }
    case '0': {
      machine.send('ZOOMED_TO_ACTUAL', info)
      break
    }
    case '1': {
      machine.send('ZOOMED_TO_FIT', info)
      break
    }
    case '2': {
      machine.send('ZOOMED_TO_SELECTION', info)
      break
    }
    case '=': {
      if (info.metaKey || info.ctrlKey) {
        e.preventDefault()
        machine.send('ZOOMED_IN', info)
      }
      break
    }
    case '-': {
      if (info.metaKey || info.ctrlKey) {
        e.preventDefault()
        machine.send('ZOOMED_OUT', info)
      }
      break
    }
    case 's':
    case 'v': {
      machine.send('SELECTED_TOOL', { name: 'select' })
      break
    }
    case 'r':
    case 'b': {
      machine.send('SELECTED_TOOL', { name: 'box' })
      break
    }
    case 'd': {
      machine.send('SELECTED_TOOL', { name: 'pencil' })
      break
    }
    case 'e': {
      machine.send('SELECTED_TOOL', { name: 'eraser' })
      break
    }
    case 'a': {
      if (info.metaKey || info.ctrlKey) {
        machine.send('SELECTED_ALL')
        e.preventDefault()
      } else {
        machine.send('SELECTED_TOOL', { name: 'arrow' })
      }
      break
    }
    case 'z': {
      if (info.metaKey || info.ctrlKey) {
        if (info.shiftKey) {
          machine.send('REDO')
        } else {
          machine.send('UNDO')
        }
      }
      break
    }
  }
}

const onKeyUp: TLKeyboardEventHandler = (key, info, e) => {
  switch (key) {
    case 'Alt':
    case 'Meta':
    case 'Control':
    case 'Shift': {
      machine.send('TOGGLED_MODIFIER', info)
      break
    }
  }
}

interface AppProps {
  onMount?: (api: Api) => void
}

let pointMapping: any = {}

export default function App({ onMount }: AppProps) {
  const appState = useStateDesigner(machine)

  const [dep, setDep] = React.useState([])

  // const pointMapping = React.useRef<any>({})

  const breakPoint = (state: any) => {
    state.pageState.selectedIds.forEach((item: string) => {
      pointMapping[item] ? pointMapping[item] : (pointMapping[item] = [])
      let endTime = new Date().getTime()
      pointMapping[item].push({
        point: state.page.shapes[item].point,
        time: new Date().toLocaleString(),
        startTime: startTime,
        endTime,
        break: true,
      })
    })
    setDep([])
  }

  const track = (state: any) => {
    if (new Date().getTime() - prevTrackTime < 200) {
      return
    }
    state.pageState.selectedIds.forEach((item: string) => {
      pointMapping[item] ? pointMapping[item] : (pointMapping[item] = [])
      let endTime = new Date().getTime()
      pointMapping[item].push({
        point: state.page.shapes[item].point,
        time: new Date().toLocaleString(),
        startTime: startTime,
        endTime,
      })
    })
    prevTrackTime = new Date().getTime()
  }

  let debouncePoint = debounce(breakPoint)

  const onPointerUp: TLPointerEventHandler = (info, e) => {
    flag = false
    machine.send('STOPPED_POINTING', info)
    if (!hasDragObject) return
    track(appState.data)
    debouncePoint(appState.data)
    hasDragObject = false
  }

  const onDragShape: TLPointerEventHandler = (info, e) => {
    hasDragObject = true
  }

  const onDragBounds: TLPointerEventHandler = (info, e) => {
    hasDragObject = true
  }

  React.useEffect(() => {
    const api = new Api(appState)
    onMount?.(api)
    window['api'] = api
  }, [])

  React.useEffect(() => {
    if (!flag) return
    track(appState.data)
    console.log(pointMapping)
  }, [appState])

  const hideBounds = appState.isInAny('transformingSelection', 'translating', 'creating')

  const firstShapeId = appState.data.pageState.selectedIds[0]
  const firstShape = firstShapeId ? appState.data.page.shapes[firstShapeId] : null
  const hideResizeHandles = firstShape
    ? appState.data.pageState.selectedIds.length === 1 &&
      shapeUtils[firstShape.type].hideResizeHandles
    : false

  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const showModal = () => setIsModalOpen(true)

  const onClose = () => setIsModalOpen(false)

  const onChange = (val: mappingProps) => {
    pointMapping = { ...val }
    setDep([])
  }

  const onExport = () => {
    let obj: map = {}
    Object.keys(pointMapping).forEach((item: any) => {
      obj[item] = pointMapping[item].filter((item: any) => !item.break)
    })
    // let map = pointMapping.filter((item:any) => !item.break)
    let blob = new Blob([JSON.stringify(obj)]) //  create blob object
    let link = document.createElement('a')
    link.href = URL.createObjectURL(blob) //  create a URL object and send to href of 'a'
    link.download = 'pointMapping.json' //  setting the name of the output file
    link.click()
  }

  return (
    <>
      <AppContainer>
        <Renderer
          shapeUtils={shapeUtils} // Required
          page={appState.data.page} // Required
          pageState={appState.data.pageState} // Required
          performanceMode={appState.data.performanceMode}
          meta={appState.data.meta}
          snapLines={appState.data.overlays.snapLines}
          onPointShape={onPointShape}
          onPointBounds={onPointBounds}
          onPointCanvas={onPointCanvas}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onHoverShape={onHoverShape}
          onUnhoverShape={onUnhoverShape}
          onPointBoundsHandle={onPointBoundsHandle}
          onPointHandle={onPointHandle}
          onPan={onPan}
          onPinchStart={onPinchStart}
          onPinchEnd={onPinchEnd}
          onPinch={onPinch}
          onPointerUp={onPointerUp}
          onBoundsChange={onBoundsChange}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onDragShape={onDragShape}
          onDragBounds={onDragBounds}
          hideBounds={hideBounds}
          hideHandles={hideBounds}
          hideResizeHandles={hideResizeHandles}
          hideIndicators={hideBounds}
          hideBindingHandles={true}
        />
        <Toolbar activeStates={appState.active} lastEvent={appState.log[0]} />
        <TitleLinks />
      </AppContainer>
      <TouchBarContainer className="touch-bar">
        <Button type="primary" onClick={showModal}>
          Trajectory Records
        </Button>
      </TouchBarContainer>
      {/* antdesign component */}
      <Drawer
        title="Records"
        open={isModalOpen}
        mask={false}
        placement="bottom"
        onClose={onClose}
        height={400}
        extra={
          <Button type="primary" onClick={onExport}>
            Output
          </Button>
        }
      >
        {/* show the Gantte graph if data exist, show "Pending" if no data */}
        {Object.keys(pointMapping).length > 0 ? (
          <Gantt2
            dep={dep}
            // Coordinates data
            pointMapping={pointMapping}
            // Dragging event
            onChange={onChange}
            // Open and Close model
            isModalOpen={isModalOpen}
          />
        ) : (
          <TextConatiner>Pending</TextConatiner>
        )}
      </Drawer>
    </>
  )
}

const AppContainer = styled('div', {
  position: 'fixed',
  top: '0px',
  left: '0px',
  right: '0px',
  bottom: '0px',
  width: '100%',
  height: '100%',
  zIndex: 101,
})

// Create the trajecory records pop-up on the right-bottom corner
const TouchBarContainer = styled('div', {
  position: 'fixed',
  bottom: '60px',
  right: '40px',
  zIndex: 102,
})

const TextConatiner = styled('div', {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  marginTop: '30px',
  marginBottom: '30px',
})
