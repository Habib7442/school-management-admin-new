declare module 'react-native' {
  import { Component } from 'react'
  
  export interface ViewProps {
    style?: any
    className?: string
    children?: React.ReactNode
    [key: string]: any
  }
  
  export class SafeAreaView extends Component<ViewProps> {}
  export class View extends Component<ViewProps> {}
  export class Text extends Component<ViewProps> {}
  export class TextInput extends Component<ViewProps> {}
  export class ScrollView extends Component<ViewProps> {}
  export class KeyboardAvoidingView extends Component<ViewProps> {}
  export class TouchableOpacity extends Component<ViewProps> {}
  
  export const Platform: {
    OS: 'ios' | 'android' | 'web'
    select: <T>(options: { ios?: T; android?: T; web?: T }) => T | undefined
  }
  
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[]) => void
  }
}
