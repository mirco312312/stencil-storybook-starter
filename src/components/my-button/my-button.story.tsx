import { withActions } from '@storybook/addon-actions';

export default (storiesOf) => {
  storiesOf('MyButton')
    .addDecorator(withActions('test'))
    .add('with action', () => `
        <div>
          Clicks on this button will be logged: <my-button value="value">Click me</my-button>
          <script>
            const myButton = document.querySelector('my-button');
            console.log('myButton', myButton);
            myButton.addEventListener('test', event => console.log(event))
          </script>
        </div>`
    )

}
