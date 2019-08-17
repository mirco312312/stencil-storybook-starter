import path from 'path';
import Case from 'case';
import { storiesOf } from '@storybook/html';
import * as KNOBS from '@storybook/addon-knobs';

/*******************************************************************************
 * You should not need to edit anything within this file unless you really     *
 * want to get your hands dirty and customize the generation of stories.       *
 * If you configured the correct require contexts, then you should be have     *
 * a decently working storybook project which displays all of your components  *
 * with working knobs and different states.                                    *
 *******************************************************************************/

const DEFAULT_DATE = new Date();

/**
 * Given a module, iterates over the exports and returns the first
 * one which looks like a stencil component (using duck typing).
 */
function getComponentFromExports(_module) {
  const key = Object.keys(_module).find(exportKey => {
    const _export = _module[exportKey];
    // does it quack like a stencil class component?
    if (_export.prototype && _export.is && _export.encapsulation) {
      return true;
    }
  });

  return _module[key];
}

/**
 * Given a property (from stencil Component.properties) and an optional
 * knobOptions object generates a knob which can be used to
 * dynamically update the properties of the component.
 */
function getKnobForProp(prop, knobOptions = {}, props = {}) {
  let type = 'text';
  let args = [prop.attribute];

  // knob options can defined using camelCase or kebab-case
  const propCamel = Case.camel(prop.attribute);
  const options = knobOptions[propCamel] || knobOptions[prop.attribute];
  const value = props[propCamel] || props[prop.attribute];

  // if knob options are defined, use those
  if (options) {
    type = options.type;
    args = args.concat(options.args);
  }
  // otherwise, implicitly create knobs based on prop type or attribute name
  else if (/^(?:number|boolean|object)$/i.test(prop.type)) {
    type = prop.type.toLowerCase();
  } else if (prop.attribute.indexOf('date') !== -1) {
    type = 'date';
    args[1] = DEFAULT_DATE;
  } else if (prop.attribute.indexOf('color') !== -1) {
    type = 'color';
  }

  if (value) {
    args[1] = value;
  } else if (prop.defaultValue) {
    args[1] = JSON.parse(prop.defaultValue);
  }

  // console.log('generating', type, 'knob with args:', args);

  const val = KNOBS[type].apply(null, args);

  switch (type) {
    // knobs returns UNIX timestamp for "date" type
    // and we need to convert it to ISO-8601
    case 'date':
      return new Date(val).toISOString();
  }

  return val;
}

/**
 * Given a stencil Component and knob options, returns an dictionary of
 * all the properties and default values.
 */
function getPropsWithKnobValues(Component, knobOptions = {}, props = {}) {
  return Object.keys(Component.properties).reduce((obj, key) => {
    const property = Component.properties[key];

    // normalize older "attr" into newer "attribute" property
    if (property.hasOwnProperty('attr')) {
      property.attribute = property.attr;
    }

    if (property.hasOwnProperty('attribute')) {
      obj[key] = getKnobForProp(property, knobOptions, props);
    }

    return obj;
  }, {});
}

/**
 * Generates an interactive knobs-enabled story for a stencil Component.
 * For any additional states, a static rendering is generated with
 * the given state (see existing components for examples).
 *
 * Example "states" array:
 *
 *   [{
 *     title: 'A title for this state',
 *     props: {
 *        --- props to set on your component ---
 *     }
 *   }]
 *
 * Example "knobs" config:
 *
 *   {
 *     someProp: {            // A decorated @Prop() on your component
 *       type: 'color',       // The type of "knob" to use in the knobs panel
 *       args: [              // Additional arguments to pass to the knob **after the "label" argument**
 *         '#ff99cc',         // The defaultValue for the "color" knob
 *         'GROUP-1'          // The groupId for the "color" knob
 *       ]
 *     }
 *   }
 */
function createStencilStory({ Component, notes, states, knobs }, storiesOf) {
  const storyOpts = notes ? { notes } : {};
  const tag = Component.is;

  // Clone the "states" array and add the default state first
  states = states && states.length ? states.slice(0) : [];
  states.unshift({
    title: 'Default',
    tag: Component.is,
    props: {}
  });

  //
  const stories = storiesOf(Component.name);

  // Create a story per state
  states.forEach(({ title, props: _props }) => {
    stories.add(
      title,
      () => {
        const mainEl = document.createElement('div');

        // First, add the knobs-enabled props to the default state.
        // Pass any props that are provided by the state, to be used as default.
        // This MUST be done inside this render function!!
        const props = getPropsWithKnobValues(Component, knobs, _props);

        // Next, render each state. Only the first one is interactive (with knobs).
        // This is sort of a light-weight "chapters" addon because the community
        // "chapters" addon only works with react :/
        const componentEl = document.createElement(tag);

        Object.keys(props).forEach(prop => {
          componentEl[prop] = props[prop];
        });

        mainEl.appendChild(componentEl);

        return mainEl;
      },
      storyOpts
    );
  });
}

/**
 * Cleans the notes, which should be in markdown format.
 * The markdown parser used by the notes addon is not the best, so
 * we have to fix some issues before rendering.
 */
function cleanNotes(notes) {
  if (notes) {
    // replaces "\|" with "` `" so property tables to break
    return notes.replace(/\\\|/g, '` `');
  }
}

function buildGeneratorConfigs(componentsCtx, storiesCtx) {
  const componentKeys = componentsCtx.keys();
  const storyKeys = storiesCtx.keys();

  return componentKeys.reduce((obj, compKey) => {
    const _module = componentsCtx(compKey);
    const Component = getComponentFromExports(_module);
    const dirName = '/' + path.basename(path.dirname(compKey)) + '/';
    const storyKey = storyKeys.find(k => k.indexOf(dirName) > -1);

    if (storyKey) {
      const _export = storiesCtx(storyKey).default;

      // If the default export is a function, then that function should
      // be used to create the story. It will be passed the "stories" object
      // where it should call stories.add(...) manually.
      if (typeof _export === 'function') {
        return Object.assign(obj, {
          [Component.name]: _export
        });
      }

      return Object.assign(obj, {
        [Component.name]: {
          Component,
          states: _export.states,
          knobs: _export.knobs,
          notes: cleanNotes(_export.notes)
        }
      });
    }

    return Object.assign(obj, {
      [Component.name]: {
        Component
      }
    });
  }, {});
}

/**
 * Iterates all of the stencil contexts and build a "config" object
 * which is used to generate the individual stories.
 */
function buildStencilStories({ loader, componentsCtx, storiesCtx }) {
  const configs = buildGeneratorConfigs(componentsCtx, storiesCtx);

  // define the custom elements so they are available
  loader.defineCustomElements(window);

  const _storiesOf = name => {
    const stories = storiesOf(name, module);
    stories.addDecorator(KNOBS.withKnobs);
    return stories;
  };

  Object.keys(configs)
    .map(comp => configs[comp])
    .forEach(config =>
      typeof config === 'function'
        ? // If the config is a function, call it with the wrapped storiesOf function.
          // The function is responsible for creating a story manually.
          // Pass any additional utilities such as knobs.
          config(name => storiesOf(name, module))
        : createStencilStory(config, _storiesOf)
    );
}

export default buildStencilStories;
