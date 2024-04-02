// @ts-ignore
import * as pc from 'playcanvas'

// draco decoder
import dracoWasmJsUrl from "./draco-decoder/draco.wasm.js?url";
import dracoWasmWasmUrl from "./draco-decoder/draco.wasm.wasm?url";
// basis decoder
import basisWasmJsUrl from "./basis-decoder/basis.wasm.js?url";
import basisWasmWasmUrl from "./basis-decoder/basis.wasm.wasm?url";
import basisJsUrl from "./basis-decoder/basis.js?url";

window.pc = pc


// @ts-ignore
window.loadModules = function (modules, urlPrefix, doneCallback) { // eslint-disable-line no-unused-vars

  if (typeof modules === "undefined" || modules.length === 0) {
    // caller may depend on callback behaviour being async
    setTimeout(doneCallback);
  } else {
    let remaining = modules.length;
    const moduleLoaded = () => {
      if (--remaining === 0) {
        doneCallback();
      }
    };

    // @ts-ignore
    modules.forEach(function (m) {
      pc.WasmModule.setConfig(m.moduleName, {
        glueUrl: urlPrefix + m.glueUrl,
        wasmUrl: urlPrefix + m.wasmUrl,
        fallbackUrl: urlPrefix + m.fallbackUrl
      });

      if (!m.hasOwnProperty('preload') || m.preload) {
        if (m.moduleName === 'BASIS') {
          // preload basis transcoder
          pc.basisInitialize();
          moduleLoaded();
        } else if (m.moduleName === 'DracoDecoderModule') {
          // preload draco decoder
          if (pc.dracoInitialize) {
            // 1.63 onwards
            pc.dracoInitialize();
            moduleLoaded();
          } else {
            // 1.62 and earlier
            pc.WasmModule.getInstance(m.moduleName, () => { moduleLoaded(); });
          }
        } else {
          // load remaining modules in global scope
          pc.WasmModule.getInstance(m.moduleName, () => { moduleLoaded(); });
        }
      } else {
        moduleLoaded();
      }
    });
  }
};


// ⚡️ ⚡️ ⚡️
export class PlaycanvasRenderer {
  public canvas: HTMLCanvasElement = document.createElement('canvas')
  public devices: PCDevices = {}
  public app?: pc.Application
  public lastWindowSize: { width: number; height: number }
  public windowSizeChangeIntervalHandler: any
  public assetPrefix: string = 'test'

  constructor(id: string, canvasAnchor?: HTMLElement) {
    const { innerWidth: width, innerHeight: height } = window
    this.lastWindowSize = {
      width,
      height,
    }
    this.assetPrefix = window.ASSET_PREFIX

    // __settings__.js
    window.ASSET_PREFIX = "";
    window.SCRIPT_PREFIX = "";
    window.CONTEXT_OPTIONS = {
      'antialias': true,
      'alpha': true,
      'preserveDrawingBuffer': true,
      'preferWebGl2': true,
      'powerPreference': "high-performance"
    };
    window.SCRIPTS = [];
    window.CONFIG_FILENAME = "config.json";
    window.INPUT_SETTINGS = {
      useKeyboard: true,
      useMouse: true,
      useGamepads: false,
      useTouch: true
    };
    pc.script.legacy = false;
    window.PRELOAD_MODULES = []

    window.SCRIPT_PREFIX = this.assetPrefix
    window.iosVersion = getIosVersion()

    this.createCanvas(id, canvasAnchor)
    this.createInputDevices()
    this.createApp()

    pc.dracoInitialize({
      jsUrl: dracoWasmJsUrl,
      wasmUrl: dracoWasmWasmUrl,
      numWorkers: 2,
      lazyInit: true,
    })

    pc.basisInitialize({
      glueUrl: basisWasmJsUrl,
      wasmUrl: basisWasmWasmUrl,
      fallbackUrl: basisJsUrl,
    })

    const configure = this.configure.bind(this)
    if (window.PRELOAD_MODULES.length > 0 && window.loadModules) {
      window.loadModules(window.PRELOAD_MODULES, window.ASSET_PREFIX, configure)
    } else {
      configure()
    }
  }

  createCanvas(canvasId: string = 'application-canvas', canvasAnchor?: HTMLElement) {
    this.canvas.setAttribute('id', canvasId)
    this.canvas.setAttribute('tabindex', '0')

    // Disable I-bar cursor on click+drag
    this.canvas.onselectstart = function () {
      return false
    }

    // Disable long-touch select on iOS devices
    // @ts-ignore
    this.canvas.style['-webkit-user-select'] = 'none'

    if (canvasAnchor) {
      canvasAnchor.appendChild(this.canvas)
    } else {
      document.body.appendChild(this.canvas)
    }
  }

  destroyCanvas() {
    this.app?.destroy()
    this.canvas.remove()
    this.canvas = document.createElement('canvas')
  }

  createInputDevices() {
    const { INPUT_SETTINGS } = window
    this.devices = {
      elementInput: new pc.ElementInput(this.canvas, {
        useMouse: INPUT_SETTINGS.useMouse,
        useTouch: INPUT_SETTINGS.useTouch,
      }),
      keyboard: INPUT_SETTINGS.useKeyboard ? new pc.Keyboard(window) : undefined,
      mouse: INPUT_SETTINGS.useMouse ? new pc.Mouse(this.canvas) : undefined,
      gamepads: INPUT_SETTINGS.useGamepads ? new pc.GamePads() : undefined,
      touch:
        INPUT_SETTINGS.useTouch && pc.platform.touch ? new pc.TouchDevice(this.canvas) : undefined,
    }
  }

  createApp() {
    const { CONTEXT_OPTIONS, ASSET_PREFIX = '', SCRIPT_PREFIX = '', SCRIPTS = [] } = window

    try {
      this.app = new pc.Application(this.canvas, {
        elementInput: this.devices.elementInput,
        keyboard: this.devices.keyboard,
        mouse: this.devices.mouse,
        gamepads: this.devices.gamepads,
        touch: this.devices.touch,
        graphicsDeviceOptions: CONTEXT_OPTIONS,
        assetPrefix: ASSET_PREFIX,
        scriptPrefix: SCRIPT_PREFIX,
        scriptsOrder: SCRIPTS,
      })
      // Set canvas renderer max pixel ratio align with device pixel ratio
      this.app.graphicsDevice.maxPixelRatio = window.devicePixelRatio

      // Expose app in the global scope
      window.app = this.app
    } catch (e) {
      if (e instanceof pc.UnsupportedBrowserError) {
        this.displayError(
          'This page requires a browser that supports WebGL.<br/>' +
          '<a href="http://get.webgl.org">Click here to find out more.</a>'
        )
      } else if (e instanceof pc.ContextCreationError) {
        this.displayError(
          "It doesn't appear your computer can support WebGL.<br/>" +
          '<a href="http://get.webgl.org/troubleshooting/">Click here for more information.</a>'
        )
      } else {
        this.displayError('Could not initialize application. Error: ' + e)
      }

      return
    }
  }

  displayError(html: string) {
    const div = document.createElement('div')

    div.innerHTML = [
      '<table style="background-color: #8CE; width: 100%; height: 100%;">',
      '  <tr>',
      '      <td align="center">',
      '          <div style="display: table-cell; vertical-align: middle;">',
      '              <div style="">' + html + '</div>',
      '          </div>',
      '      </td>',
      '  </tr>',
      '</table>',
    ].join('\n')

    document.body.appendChild(div)
  }

  configureCss(fillMode: string, width: string, height: string) {
    // Configure resolution and resize event
    if (this.canvas.classList) {
      this.canvas.classList.add('fill-mode-' + fillMode)
    }

    // css media query for aspect ratio changes
    var css = '@media screen and (min-aspect-ratio: ' + width + '/' + height + ') {'
    css += '    #application-canvas.fill-mode-FILL_WINDOW {'
    css += '        width: auto;'
    css += '        height: 100%;'
    css += '        margin: 0 auto;'
    css += '    }'
    css += '}'

    let headStyle = document.head.querySelector('style')
    // append css to style
    if (headStyle) {
      headStyle.innerHTML += css
    }
  }

  resizeCanvas() {
    const { app, canvas } = this
    if (!app || !canvas) {
      throw new Error('resize canvas failed with app and canvs not found...')
    }
    canvas.style.width = ''
    canvas.style.height = ''
    app.resizeCanvas(canvas.width, canvas.height)

    var fillMode = app._fillMode

    if (fillMode == pc.FILLMODE_NONE || fillMode == pc.FILLMODE_KEEP_ASPECT) {
      if (
        (fillMode == pc.FILLMODE_NONE && canvas.clientHeight < window.innerHeight) ||
        canvas.clientWidth / canvas.clientHeight >= window.innerWidth / window.innerHeight
      ) {
        canvas.style.marginTop = Math.floor((window.innerHeight - canvas.clientHeight) / 2) + 'px'
      } else {
        canvas.style.marginTop = ''
      }
    }

    this.lastWindowSize.height = window.innerHeight
    this.lastWindowSize.width = window.innerWidth

    // Work around when in landscape to work on iOS 12 otherwise
    // the content is under the URL bar at the top
    if (window.iosVersion && window.iosVersion[0] <= 12) {
      window.scrollTo(0, 0)
    }
  }

  reflow() {
    const { lastWindowSize } = this
    const resizeCanvas = this.resizeCanvas.bind(this)
    let { windowSizeChangeIntervalHandler } = this
    resizeCanvas()

    // Poll for size changes as the window inner height can change after the resize event for iOS
    // Have one tab only, and rotate from portrait -> landscape -> portrait
    if (windowSizeChangeIntervalHandler === null) {
      windowSizeChangeIntervalHandler = setInterval(() => {
        if (
          lastWindowSize.height !== window.innerHeight ||
          lastWindowSize.width !== window.innerWidth
        ) {
          resizeCanvas()
        }
      }, 100)

      // Don't want to do this all the time so stop polling after some short time
      setTimeout(function () {
        if (!!windowSizeChangeIntervalHandler) {
          clearInterval(windowSizeChangeIntervalHandler)
          windowSizeChangeIntervalHandler = null
        }
      }, 2000)
    }
  }

  configure() {
    const { app } = this
    const configureCss = this.configureCss.bind(this)
    const reflow = this.reflow.bind(this)
    const reflowHandler = () => {
      reflow()
    }
    const { CONFIG_FILENAME } = window

    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    console.log('app._fillMode', app._fillMode)

    app?.configure(`./${CONFIG_FILENAME}`, (err: any) => {
      if (err) {
        console.error(err)
      }

      configureCss(app._fillMode, app._width, app._height)

      const ltcMat1 = [] as number[]
      const ltcMat2 = [] as number[]

      if (ltcMat1.length && ltcMat2.length && app.setAreaLightLuts.length === 2) {
        app.setAreaLightLuts(ltcMat1, ltcMat2)
      }

      // do the first reflow after a timeout because of
      // iOS showing a squished iframe sometimes
      setTimeout(() => {
        reflow()

        window.addEventListener('resize', reflowHandler, false)
        window.addEventListener('orientationchange', reflowHandler, false)

        // app.preload(function () {
        //   app.scenes.loadScene(assetPrefix + SCENE_PATH, function (err, scene) {
        //     if (err) {
        //       console.error(err)
        //     }
        //     console.log('[Core.configure]', { scene })
        //     app.start()
        //   })
        // })
      })
    })
  }
}

export function getIosVersion() {
  if (/iP(hone|od|ad)/.test(navigator.platform)) {
    var v = navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/)
    if (!v) return undefined
    var version = [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || '0', 10)]
    return version
  }

  return undefined
}