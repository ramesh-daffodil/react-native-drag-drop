/* @flow */

'use strict';

import React , { PropTypes } from 'react';
import ReactNative from 'react-native';
const {
  Animated,
  PanResponder,
  View,
} = ReactNative;

import invariant from 'invariant';
import { DragContext, createDragContext } from './DragContext';
import { createDragPanResponder } from './DragPanResponder';
import type { DragItem } from './DragContext';


import type {
  NativeLayoutEvent,
  Position,
} from './types';

type Props = {};

export type State = {
  currentDropZone: ?string,
  currentDropZoneEdge: ?string,
  dragItem: ?any,
  panResponder: ?PanResponder,
  pan: ?Animated.ValueXY,
};

export function createDragArena(
  Component: ReactClass,
  DragShadowComponent: ReactClass,
  dragContext: DragContext,
  panDirection: string
): ReactClass {
  dragContext = createDragContext((props, state) => {
      // const dragItem = state.dragItem; // This should probably be passed as the 1st arg to onDrop.
      // console.log('This is the onDrop callback. You just dropped a thing!', dragItem);
      // Must return a promise.
      return Promise.resolve();
  })
  class DragArena extends (React.Component : typeof ReactComponent) {
    props: Props;
    state: State;

    static defaultProps: {};

    panListener: string;

    constructor(props: Props) {
      super(props);
      this.panListener = '';
      this.state = {
        ...Component.state,
        currentDropZone: null,
        currentDropZoneEdge: null,
        dragItem: null,
        panResponder: null, // Will be initialized during a drag.
        pan: null,
      };
    }

    getChildContext() {
      return {
        dragContext,
      };
    }

    cacheBaseLayout(e: NativeLayoutEvent) {
      dragContext.setBaseLayout(e.nativeEvent.layout);
    }

    /**
     * Long press gesture handler, starts drag operation.
     *
     * Sets up the state invariants for the drag, such as default pan state.
     *
     * Note that the pan needs to be re-initialized to a non-zero value,
     * because the drag shadow tracks the pan state and it will jump around
     * when pan offset defaults to 0.
     *
     */
    handleLongPress(dragItem: DragItem) {
      // invariant(typeof dropZoneName === 'string', 'Drop zone must be a string!');
      invariant(dragItem, 'Drag item must be valid!');
      this.setState((state: State) => {
        const dragItemLayout = dragContext.getDragItemLayout(dragItem);
        invariant(dragItemLayout, 'Drag item layout not stored!');
        state.currentDropZone = dragItemLayout.dropZoneName;
        invariant(state.currentDropZone, 'Must have a valid drop zone!');
        state.dragItem = dragItem;
        const pan = state.pan = new Animated.ValueXY();
        this.panListener = pan.addListener(this.watchPanChanges.bind(this));
        pan.setOffset({
          x: dragContext.getDragItemOffset(dragItem, 'x'),
          y: dragContext.getDragItemOffset(dragItem, 'y'),
        });
        const onStop = () => {
          return dragContext.drop(this.props, this.state).then(() => {
            this.stopDrag();
          });
        }
        state.panResponder = createDragPanResponder(
          state, dragContext, panDirection, onStop
        );
        return state;
      });
    }


    watchPanChanges(pos: Position) {
      const dropZoneName = dragContext.getDropZoneFromYOffset(pos.y, pos.x);

      if (dropZoneName) {
        const edge = dragContext.getDropZoneEdge(pos, dropZoneName);
        if (edge !== this.state.currentDropZoneEdge) {
          this.setState({
            currentDropZoneEdge: edge
          });
        }

        if (dropZoneName !== this.state.currentDropZone) {
          this.setState({
            currentDropZone: dropZoneName,
          });
        }
      } else {
        this.setState({
            currentDropZone: null,
            currentDropZoneEdge: null
          });
      }
    }

    /**
     * Stop the drag action.
     *
     * Nullify all the state required for the drag (pan, pan responder,
     * drop zone, etc.).
     *
     * This also removes the pan listener.
     */
    stopDrag() {
      this.refs.abc.ondrop(this.props, this.state);
      this.setState((state) => {
        state.currentDropZone = null;
        state.dragItem = null;
        state.panResponder = null;
        // onPanResponderRelease() can occasionally be called multiple times.
        state.pan && state.pan.removeListener(this.panListener);
        this.panListener = '';
        state.pan = null;
        return state;
      });
    }

    render() {
      const {
        currentDropZone,
        currentDropZoneEdge,
        dragItem,
        pan,
      } = this.state;

      let dragShadow;
      let panHandlers;
      if (dragItem && pan) {
        dragShadow = (
          <DragShadowComponent
            currentDropZone={currentDropZone}
            pan={pan}
            dragItem={dragItem}
            dragItemLayout={dragContext.getDragItemLayout(dragItem).layout} />
        );
      }

      if (this.state.panResponder) {
        panHandlers = this.state.panResponder.panHandlers;
      }

      const cacheBaseLayout = this.cacheBaseLayout.bind(this);
      const startDragHandler = this.handleLongPress.bind(this);
      const scrollEnabled = !dragItem;
      return (
        <View style={{flex: 1}} {...panHandlers} onLayout={cacheBaseLayout}>
          <Component
            startDragHandler={startDragHandler}
            scrollEnabled={scrollEnabled}
            dragItem={dragItem}
            currentDropZone={currentDropZone}
            currentDropZoneEdge={currentDropZoneEdge}
            stopDrag={this.stopDrag.bind(this)}
            ref = "abc"
            {...this.props} />
          {dragShadow}
        </View>
      );
    }
  }

  DragArena.childContextTypes = {
    dragContext: PropTypes.instanceOf(DragContext),
  };

  return DragArena;
}