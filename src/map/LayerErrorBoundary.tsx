import { Component, type ReactNode } from 'react'
import { reportError } from '@/core/data/healthStore'

interface Props {
  featureId: string
  sourceId?: string
  children: ReactNode
}

interface State {
  failed: boolean
}

/**
 * A feature layer that throws must not take the workstation down with it.
 * Before this, one malformed product response unmounted the whole app —
 * every panel, every other layer — with a blank canvas and nothing to say
 * why. Now the broken layer drops out, its source turns red in the health
 * strip, and everything else keeps working. Toggling the feature off and
 * on remounts it.
 */
export class LayerErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[${this.props.featureId}] layer crashed:`, message)
    if (this.props.sourceId) {
      reportError({ id: this.props.sourceId, label: this.props.featureId }, `layer crashed: ${message}`)
    }
  }

  componentDidUpdate(prev: Props): void {
    // A remount (feature toggled off/on) gets a fresh try.
    if (prev.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false })
    }
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children
  }
}
