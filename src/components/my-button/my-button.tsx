import { Component, Prop, h, Event, EventEmitter } from '@stencil/core';

@Component({
  tag: 'my-button',
  shadow: true
})
export class MyButton {
  /**
   * The value to emit on click
   */
  @Prop() value: string;

  @Event() test: EventEmitter;

  render() {
    return <button onClick={this._handleClick}><slot /></button>;
  }

  private _handleClick() {
    if (this.test) {
      this.test.emit({ value: this.value });
    }
  }

}
