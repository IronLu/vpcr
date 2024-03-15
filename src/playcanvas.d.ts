import * as _pc from 'playcanvas'
declare global {
  const pc: typeof _pc

  type PCDevices = {
    elementInput?: pc.ElementInput
    keyboard?: pc.Keyboard
    mouse?: pc.Mouse
    touch?: pc.TouchDevice
    gamepads?: pc.GamePads
    scriptPrefix?: string
    assetPrefix?: string
    graphicsDeviceOptions?: object
    scriptsOrder?: string[]
  }

  interface Window {
    pc: any
    app: typeof _pc.app
    application: Application
    iosVersion?: number[]
    loadModules: function
    CONFIG_FILENAME: string
    SCENE_PATH: string
    CONTEXT_OPTIONS: object
    ASSET_PREFIX: string
    SCRIPT_PREFIX: string
    SCRIPTS: []
    PRELOAD_MODULES: Record<string, string>[]
    INPUT_SETTINGS: {
      useKeyboard: boolean
      useMouse: boolean
      useGamepads: boolean
      useTouch: boolean
    }
  }
}
