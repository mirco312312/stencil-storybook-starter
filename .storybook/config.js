import { configure } from '@storybook/html';
import buildStencilStories from './stories/stencil';

// The following context will be used to generate stories.
// Each component can generate complex stories using the API of @storybook/html
function loadStories() {
  buildStencilStories({
    loader: require('../loader/index.cjs.js'),
    componentsCtx: require.context('../dist/collection', true, /\/components\/([^/]+)\/\1\.js$/),
    storiesCtx: require.context('../src', true, /\.story\.tsx$/)
  })
}

configure(loadStories, module);
