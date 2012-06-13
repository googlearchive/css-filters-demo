/**
 * @fileoverview Base class for all ArtElements.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.ArtElement');
goog.provide('gfd.ArtElement.FactoryDelegate');

goog.require('gfd.Rectangle');
goog.require('goog.events.EventTarget');


/**
 * The abstract base class for any element added to an ArtBoard. Subclasses
 * could be WebGl, SVG, Video elements. Use the addClass methods to apply
 * css classes with filters.
 * @param {string} typeName
 * @param {number=} opt_allFlags update flags specific to subclasses.
 * @constructor
 * @extends {goog.events.EventTarget}
 */
gfd.ArtElement = function(typeName, opt_allFlags)
{
  /**
   * A unique id for the art element to allow for hashing.
   * @type {number}
   * @private
   */
  this.uid_ = gfd.ArtElement.uid_++;
  
  /**
   * Allows generic data to be attached to the element.
   * @type {?Object}
   * @private
   */
  this.userData_ = null;
  
  /**
   * The type of element.
   * @type {string}
   * @private
   */
  this.elementTypeName_ = typeName;
  
  /**
   * A retain count. For proper disposal
   * @type {number}
   * @private
   */
  this.retain_ = 0;
  
  /**
   * A unique hash.
   * @type {?string}
   * @private
   */
  this.hash_ = null;
  
  /**
   * The main dom element that filters can be applied to and that will contain
   * any elements created by implementations.
   * @type {Element}
   * @private
   */
  this.containerEl_ = null;
  
  /**
   * The dom element that is a child of the container.
   * @type {Element}
   * @private
   */
  this.domEl_ = null;
  
  /**
   * All possible invalidation flags. Called on add.
   * @type {number}
   */
  this.allFlags_ = gfd.ArtElement.UpdateFlags.ADD | 
                   gfd.ArtElement.UpdateFlags.RENDER |
                   gfd.ArtElement.UpdateFlags.CSS | 
                   gfd.ArtElement.UpdateFlags.RECT |
                   gfd.ArtElement.UpdateFlags.TRANSFORM;
  
  
  /**
   * The bounds of the object on the art board.
   * @type {gfd.Rectangle}
   * @private
   */
  this.rect_ = null;
  
  /**
   * When modify the rect, this gets set on the next render loop.
   * @type {gfd.Rectangle}
   * @private
   */
  this.newRect_ = null;
  
  /**
   * Flags used by the art board to know if this object needs updating.
   * @type {number}
   */
  this.updateFlags = 0;
  
  /**
   * Linked list functionality used by the art board for updates.
   * @type {gfd.ArtElement}
   */
  this.updateNext = null;
  
  /**
   * The artboard that holds this object, or null.
   * @type {Object}
   * @private
   */
  this.artBoard_ = null;

  /**
   * Internal flag if initialized. Usually init gets called when first added
   * to the artboard.
   * @type {Boolean}
   * @private
   */
  this.loaded_ = false;
  
  /**
   * A string array of classes.
   * @type {Array.<string>}
   * @private
   */
  this.classes_ = [];
  
  /**
   * Used for transforming inner data. This is a two dimensional transform
   * matrix in column major format. Doesn't include third row. Currently only
   * translates are supported.
   * @type {Array.<number>}
   * @private
   */
  this.transform_ = [1, 0, 1, 0, 0, 0];
  
  /**
   * A filter string.
   * @type {string}
   * @private
   */
  this.filterString_ = '';
  
  /**
   * The time in seconds this was last called. It will be zero on first call.
   * @type {number}
   * @private
   */
  this.lastTime_ = 0;
  
  /**
   * The z-index for the element on the canvas. Defaults to 1, zero reserved
   * for background.
   * @type {number}
   * @private
   */
  this.depth_ = 1;
  
  /**
   * An index that is used when added to the stage. The artboard increments its
   * index counter and applies to this property so we know the order in which
   * items were added.
   * @type {number}
   * @private
   */
  this.index_ = 0;
  
  /**
   * A flag to update the filter string on the next update loop.
   * @type {boolean}
   * @private
   */
  this.needsFilterStringUpdate_ = false;
  
  /**
   * A flag to update the classes on the next css update loop.
   * @type {boolean}
   * @private
   */
  this.needsClassUpdate_ = false;
  
  /**
   * Flag if depth has changed
   * @type {boolean}
   * @private
   */
  this.depthChanged_ = true;
  
  /**
   * A number representing the last time this object was 'touched.'
   * @type {number}
   * @private
   */
  this.touchTime_ = 0;

  
  if (opt_allFlags)
  {
    if (this.allFlags_ & opt_allFlags)
    {
      throw 'ArtElement Flag Error! Subclass flag collides.!';
    }
    
    this.allFlags_ |= opt_allFlags;
  }
};
goog.inherits(gfd.ArtElement, goog.events.EventTarget);


/**
 * An id used to hash the object for faster lookups and useful in serialization.
 * Every time an object is created this static is increased so each ArtElement
 * has a unique identifier. This allows simple hashing, etc.
 * @type {number}
 * @private
 */
gfd.ArtElement.uid_ = 0;

/**
 * Enum for update flags. These are passed to ArtBoard.update so the art 
 * element can be added to the update loop for specific operations. These 
 * happen once per loop.
 * @enum {number}
 */
gfd.ArtElement.UpdateFlags = {
  ADD: 1,
  CLEAR_ADD: ~1,
  RENDER: 2,
  CLEAR_RENDER: ~2,
  CSS: 4,
  CLEAR_CSS: ~4,
  RECT: 8,
  CLEAR_RECT: ~8,
  TRANSFORM : 16,
  CLEAR_TRANSFORM: ~16,
  RESERVED_1 : 32,
  RESERVED_2 : 64,
  BLOCK: 0x40000000
};


/**
 * @interface
 */
gfd.ArtElement.FactoryDelegate = function() {};

/**
 * Requests that the least recently used item of the specific class be disposed
 * of. 
 * @param {function(new: gfd.ArtElement)> artElClass
 * @param {function=} opt_filterFunc
 * @returns {boolean} if it was disposed.
 */
gfd.ArtElement.FactoryDelegate.prototype.removeLruOfClass = function(artElClass,
    opt_filterFunc){};


/**
 * Called after creating the element. This initializes with the main dom
 * element provided by subclasses and the initialization data if any. 
 * Subclasses must call this on creation. It sets retain count to 1 so it
 * must be explicitly released after calling init.
 * @param {Element} domEl
 */
gfd.ArtElement.prototype.init = function(domEl)
{
  if (domEl)
  {
    this.domEl_ = domEl;
    this.containerEl_ = document.createElement('div');
    this.containerEl_.appendChild(domEl);
    this.addClass('gfd-art-element');
    this.retain_ = 1;
    return this;
  }
};

/**
 * Base functionality for serialization routines of all art elements. Stores the
 * element's unique id for map lookup as well as some other basic info that is
 * common to all elements. 
 * @returns {Object} a serializable object.
 */
gfd.ArtElement.prototype.serialize = function()
{
  return {
    'u': this.uid_,
    'r': this.rect_ ? [this.rect_.x, this.rect_.y, 
                     this.rect_.width, this.rect_.height] : null,
    'd': this.depth_
  };
};

/**
 * Base method for deserialization routines of all art elements. The reverse
 * of what is done in the serialization method.
 * @param {Object} data The data object to deserialize.
 * @returns {?gfd.ArtElement} Returns this if deserialization had no errors
 * otherwise it returns undefined.
 */
gfd.ArtElement.prototype.deserialize = function(data)
{
  if (goog.isDef(data['u']) && goog.isDef(data['r']))
  {
    this.uid_ = data['u'];
    if (this.uid_ >= gfd.ArtElement.uid_) gfd.ArtElement.uid_ = this.uid_ + 1;
    
    if (data['r'])
    {
      this.setRect(new gfd.Rectangle(data['r'][0], data['r'][1], 
        data['r'][2], data['r'][3]));
    }
    
    if (goog.isDef(data['d']))
    {
      this.setDepth(data['d']);
    }
    
    return this;
  }
};

/**
 * Method used for super simple reference counting so we know when to dispose
 * of art elements when they are removed from the artboard.
 */
gfd.ArtElement.prototype.retain = function()
{
  this.retain_++;
};

/**
 * Method used for super simple reference counting so we know when to dispose
 * of art elements when they are removed from the artboard.
 */
gfd.ArtElement.prototype.release = function()
{
  if (--this.retain_ === 0)
  {
    this.dispatchEvent('dispose');
    this.dispose();
  }
};

/**
 * Touches the element signifying its importance.
 */
gfd.ArtElement.prototype.touch = function()
{
  this.touchTime_ = goog.now();
};

/** @override */
gfd.ArtElement.prototype.disposeInternal = function()
{
  if (this.domEl_ && this.domEl_.parentNode)
  {
    this.domEl_.parentNode.removeChild(this.domEl_);
  }
  this.domEl_ = null;
  
  if (this.containerEl_ && this.containerEl_.parentNode)
  {
    this.containerEl_.parentNode.removeChild(this.containerEl_);
  }
  this.containerEl_ = null;
  
  this.updateFlags = 0;
  this.artBoard_ = null;
  this.rect_ = null;
  this.userData_ = null;
  
  goog.events.EventTarget.prototype.disposeInternal.call(this);
};

/**
 * Returns the element that represents this object in terms of its technology.
 * For instance a canvas, a webgl object, etc.
 * @returns {string}
 */
gfd.ArtElement.prototype.getElementType = function() 
{
  return this.elementTypeName_;
};

/**
 * Moves the anchor point. This allows internal data to be modified.
 * @param {number=} opt_offsetX
 * @param {number=} opt_offsetY
 */
gfd.ArtElement.prototype.translate = function(opt_offsetX, opt_offsetY)
{
  if (opt_offsetX || opt_offsetY)
  {
    if (goog.isDef(opt_offsetX)) this.transform_[4] += opt_offsetX;
    if (goog.isDef(opt_offsetY)) this.transform_[5] += opt_offsetY;
  
    this.requestUpdate(gfd.ArtElement.UpdateFlags.TRANSFORM);
  }
};




/**
 * Sets a flag to update the rectangle with the given rectangle on the next
 * render. The rect represent the window into the canvas, so any internal data
 * is not modified when the rect is changed it just changes the window on the
 * data. Use moveRect to move the rectangle and the data.
 * @param {...*} var_args
 */
gfd.ArtElement.prototype.setRect = function(var_args)
{
  if (!this.newRect_) this.newRect_ = new gfd.Rectangle();
  
  if (arguments.length === 1)
  {
    var r = arguments[0];
    this.newRect_.x = r.x;
    this.newRect_.y = r.y;
    this.newRect_.width = r.width;
    this.newRect_.height = r.height;
  }
  else if (arguments.length >= 2)
  {
    this.newRect_.x = arguments[0];
    this.newRect_.y = arguments[1];
    
    if (arguments.length >= 4)
    {
      this.newRect_.width = arguments[2];
      this.newRect_.height = arguments[3];
    }
  }
  
  if (!this.rect_ || !this.newRect_.equals(this.rect_))
  {
    this.requestUpdate(gfd.ArtElement.UpdateFlags.RECT);
  }
};



/**
 * Swaps the dom element with the given dom element. Mainly used for caching.
 * @param {Element} newDomEl
 * @protected
 */
gfd.ArtElement.prototype.swapDomEl = function(newDomEl)
{
  if (this.domEl_ === newDomEl) return;
  if (this.domEl_)
  {
    if (this.domEl_.parentNode)
    {
      this.domEl_.parentNode.replaceChild(newDomEl, this.domEl_);
    }
    
    this.domEl_.className = ''; // TODO: is this necessary, don't think has classes
  }
  
  this.domEl_ = newDomEl;
};

/**
 * Called by implementations when they want their update function called. With
 * the specific flag set.
 * @param {number} flags to be called with
 * @protected
 */
gfd.ArtElement.prototype.requestUpdate = function(flags)
{
  if (this.artBoard_) this.artBoard_.requestUpdate(this, flags);
};

/**
 * Called by implementations when they want their update function called. With
 * just the render flag.
 * @protected
 */
gfd.ArtElement.prototype.requestRender = function()
{
  if (this.artBoard_)
  {
    this.artBoard_.requestUpdate(this, gfd.ArtElement.UpdateFlags.RENDER);
  }
};


/**
 * Sets the stacking depth of the art element on the artboard.
 * @param {number} depth
 */
gfd.ArtElement.prototype.setDepth = function(depth)
{
  if (depth !== this.depth_)
  {
    this.depth_ = depth;
    this.depthChanged_ = true;
    
    if (this.artBoard_) this.artBoard_.artElementDepthChanged();
    this.requestUpdate(gfd.ArtElement.UpdateFlags.CSS); // Will update z-index
  }
};
  
/**
 * Sets a given key value for generic user data.
 * @param {string} key
 * @param {*} value
 */
gfd.ArtElement.prototype.setUserData = function(key, value)
{
  if (!this.userData_) this.userData_ = {};
  this.userData_[key] = value;
};

/**
 * Returns generic user data associated with the object.
 * @param {string} key
 * @returns {*}
 */
gfd.ArtElement.prototype.getUserData = function(key)
{
  if (this.userData_) return this.userData_[key];
};


/**
 * Called when a request for an update was issued. This should not be overriden.
 * Instead override updateImpl
 * @param {number} time
 * @param {number} flags
 * @returns {number}
 */
gfd.ArtElement.prototype.update = function(time, flags)
{
  if (flags & gfd.ArtElement.UpdateFlags.ADD)
  {
    this.artBoard_._add(this);
    //this.artBoard_.getDomEl().appendChild(this.containerEl_);
    flags &= gfd.ArtElement.UpdateFlags.CLEAR_ADD;
  }
  
  if (flags & gfd.ArtElement.UpdateFlags.CSS)
  {
    if (this.needsClassUpdate_)
    {
      this.containerEl_.className = this.classes_.join(' '); // Update class name
      this.needsClassUpdate_ = false;
    }
    
    if (this.needsFilterStringUpdate_)
    {
      this.containerEl_.style['-webkit-filter'] = this.filterString_;
      this.needsFilterStringUpdate_ = false;
    }
    
    if (this.depthChanged_)
    {
      this.depthChanged_ = false;
      this.containerEl_.style['z-index'] = this.depth_;
    }
    
    flags &= gfd.ArtElement.UpdateFlags.CLEAR_CSS;
  }
  
  if (flags & gfd.ArtElement.UpdateFlags.TRANSFORM)
  {
    // Is the transform not the identity
    if (this.transform_[0] !== 1 || this.transform_[1] !== 0 ||
        this.transform_[2] !== 0 || this.transform_[3] !== 1 ||
        this.transform_[4] !== 0 || this.transform_[5] !== 0)
    {
      if (this.updateTransformImpl(this.transform_))
      {
        // Need to also update the rectangle, for now only update for transform
        // since rotations probably will never happen. This transforms original
        // point data.
        if (!this.newRect_) this.newRect_ = this.rect_.clone();
        this.newRect_.x += this.transform_[4];
        this.newRect_.y += this.transform_[5];
        flags |= gfd.ArtElement.UpdateFlags.RECT;
      }
      else if (this.rect_)
      {
        this.containerEl_.style.left = this.rect_.x + 'px';
        this.containerEl_.style.top = this.rect_.y + 'px';
      }

      // Reset the transform to identity
      this.transform_[0] = 1; this.transform_[1] = 0;
      this.transform_[2] = 0; this.transform_[3] = 1;
      this.transform_[4] = 0; this.transform_[5] = 0;
    }

    flags &= gfd.ArtElement.UpdateFlags.CLEAR_TRANSFORM;
  }
  
  if (flags & gfd.ArtElement.UpdateFlags.RECT)
  {
    if (this.newRect_ && (!this.rect_ || !this.newRect_.equals(this.rect_)))
    {
      this.containerEl_.style.left = this.newRect_.x + 'px';
      this.containerEl_.style.top = this.newRect_.y + 'px';
  
      var oldRect = this.rect_;
      this.rect_ = this.newRect_;
      
      this.updateRectImpl(oldRect, this.newRect_);

      this.newRect_ = oldRect ? oldRect : new gfd.Rectangle();


      this.newRect_.x = this.rect_.x;
      this.newRect_.y = this.rect_.y;
      this.newRect_.width = this.rect_.width;
      this.newRect_.height = this.rect_.height;
    }
    
    flags &= gfd.ArtElement.UpdateFlags.CLEAR_RECT;
  }
  
  
  
  // Pass any other flags on to the implementation. Each implementation must
  // clear the RENDER_FLAG if it doesn't want to continue rendering.
  if (flags) 
  {
    flags = this.updateImpl((this.lastTime_ !== 0 || (time - this.lastTime_ < 1.0)) ?
      time - this.lastTime_ : 0, flags);
  }
  
  this.lastTime_ = time;
  return flags;
};



/**
 * A utility method to transform all important points by the given transform
 * matrix.
 * @param {Array.<number>} transform a transform matrix in column major
 * @protected
 */
gfd.ArtElement.prototype.transformDataPoints = function(transform)
{
  var i, j, points = [];
  this.collectDataPoints(points);
  
  if (points.length)
  {
    // If its just a translate
    if (transform[0] === 1 && transform[1] === 0 &&
        transform[2] === 0 && transform[3] === 1)
    {
      for (i = points.length - 1; i >= 0; --i)
      {
        if (goog.isArray(points[i]))
        {
          for (j = points[i].length - 1; j >= 0; --j)
          {
            points[i][j].x += transform[4];
            points[i][j].y += transform[5];
          }
        }
        else
        {
          points[i].x += transform[4];
          points[i].y += transform[5];
        }
      } 
    }
  }
};

/**
 * A method for implementations to override. When the controller wants an
 * art element to handle new data. The art element can take the data and return
 * true or ignore the data, in which case the controller has to do something.
 * Handle data, gives a bounding rectangle and a set of points to the element
 * in absolute units. This item can choose to use the data or not. If it returns
 * true, it takes the data and re-renders itself. If it returns false, the
 * controller looks for another stroke to handle the data. For all subclasses
 * the first time handleData is called it should accept it since that is the
 * initializer.
 * @param {gfd.Rectangle} rect
 * @param {Array.<gfd.Point>} points
 * @returns {boolean}
 * @protected
 */
gfd.ArtElement.prototype.handleData = function(rect, points)
{
  return false;
};


/**
 * Handle selection takes a point in global space and returns a selection object
 * if we register a selection.
 * @param {number} x an x coordinate in absolute coordinates
 * @param {number} y a y coordinate in absolute coordinates
 * @param {gfd.Selection=} opt_selection an optional selection object, if 
 * provided the selection object is filled with specific data that can be passed 
 * to the select method.
 * @returns {boolean}
 */
gfd.ArtElement.prototype.hit = function(x,y, opt_selection)
{
  return this.rect_ ? this.rect_.contains(x,y) : false;
};




/**
 * Returns the rectangle that defines the bounds of this element.
 * @returns {gfd.Rectangle}
 */
gfd.ArtElement.prototype.getRect = function()
{
  // TODO: are there any problems returning newRect instead of rect, it is
  // more accurate because it better reflects what the current state is
  return this.newRect_;
};


/**
 * Adds a class to be appended to the class names of the main dom container.
 * @param {string} className
 */
gfd.ArtElement.prototype.addClass = function(className)
{
  if (this.classes_.indexOf(className) === -1)
  {
    this.classes_.push(className);
    this.needsClassUpdate_ = true;
    this.requestUpdate(gfd.ArtElement.UpdateFlags.CSS); // Defer update 
  }
};

/**
 * Removes a class from the class names of the main dom container.
 * @param {string} className
 */
gfd.ArtElement.prototype.removeClass = function(className)
{
  var index;
  
  if ((index = this.classes_.indexOf(className)) !== -1)
  {
    this.classes_.splice(index, 1);
    this.needsClassUpdate_ = true;
    this.requestUpdate(gfd.ArtElement.UpdateFlags.CSS); // Defer update
  }
};

gfd.ArtElement.prototype.setFilterString = function(str)
{
  if (str !== this.filterString_)
  {
    this.filterString_ = str;
    this.needsFilterStringUpdate_ = true;
    this.requestUpdate(gfd.ArtElement.UpdateFlags.CSS); // Defer update
  }
};

/**
 * Returns the dom element used by the art element implementation.
 * @returns {Element}
 */
gfd.ArtElement.prototype.getDomEl = function()
{
  return this.containerEl_;
};

/**
 * Returns the container dom element used to add to the dom tree.
 * @returns {Element}
 */
gfd.ArtElement.prototype.getRenderEl = function()
{
  return this.domEl_;
};

/**
 * Function for sorting based on z-index
 * @param {gfd.ArtElement} lhs
 * @param {gfd.ArtElement} rhs
 * @returns {Number}
 */
gfd.ArtElement.sortByDepthAndIndex = function(lhs, rhs)
{
  if (lhs.depth_ < rhs.depth_) return -1;
  if (lhs.depth_ > rhs.depth_) return 1;
  if (lhs.index_ < rhs.index_) return -1;
  if (lhs.index_ > rhs.index_) return 1;
  return 0; // shouldn't get here;
};

/**
 * Function for sorting based on last touch time, depth, and index
 * @param {gfd.ArtElement} lhs
 * @param {gfd.ArtElement} rhs
 * @returns {Number}
 */
gfd.ArtElement.sortByLruAndDepthAndIndex = function(lhs, rhs)
{
  if (lhs.touchTime_ > rhs.touchTime_) return -1;
  if (lhs.touchTime_ < rhs.touchTime_) return 1;
  if (lhs.depth_ < rhs.depth_) return -1;
  if (lhs.depth_ > rhs.depth_) return 1;
  if (lhs.index_ < rhs.index_) return -1;
  if (lhs.index_ > rhs.index_) return 1;
  return 0; // shouldn't get here;
};

/**
 * Function for sorting based on z-index
 * @param {gfd.ArtElement} rhs
 * @returns {Number}
 */
gfd.ArtElement.prototype.compareOrder = function(rhs)
{
  if (this.depth_ < rhs.depth_) return -1;
  if (this.depth_ > rhs.depth_) return 1;
  if (this.index_ < rhs.index_) return -1;
  if (this.index_ > rhs.index_) return 1;
  return 0;
};

/**
 * Called when the element is added to an artboard.
 * @param {Object}
 * @param {number} index an index telling the order it was added
 * @param {boolean} frozen whether the artboard is currently frozen
 */
gfd.ArtElement.prototype.added = function(artBoard, index, frozen)
{
  this.artBoard_ = artBoard;
  this.index_ = index;
  this.touchTime_ = goog.now();
  
  if (!this.loaded_)
  {
    this.loaded_ = true;
    this.load();
  }
  
  if (frozen) this.freeze();
  else this.unfreeze();

  artBoard.requestUpdate(this, this.allFlags_);
};

/**
 * Get the unique hash for this object.
 * @returns {string}
 */
gfd.ArtElement.prototype.hash = function()
{
  return this.hash_ || (this.hash_ = ':' + this.uid_);
};

/**
 * Called when the element is removed from an artboard.
 */
gfd.ArtElement.prototype.removed = function()
{
  this.artBoard_ = null;
  
  if (this.containerEl_.parentNode)
  {
    this.containerEl_.parentNode.removeChild(this.containerEl_);
  }
};

/**
 * Called when the palette changes. Art elements can choose to ignore this by
 * simply not implementing the method.
 * @param {string} paletteName the name of the new palette.
 */
gfd.ArtElement.prototype.setPaletteName = function(paletteName) {};

/**
 * A method for implementations to override for their update function.
 * @param elapsedTimeInSeconds
 * @param flags
 * @returns {number}
 * @protected
 */
gfd.ArtElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  return 0;
};

/**
 * A method for implementations to override when the rect gets updated in the
 * update loop. (After a call to setRect)
 * @param oldRect
 * @param newRect
 * @protected
 */
gfd.ArtElement.prototype.updateRectImpl = function(oldRect, newRect) {};

/**
 * A method for implementations to override when the transformation gets updated 
 * in the update loop. (After a call to translate)
 * @param {Array.<number>} transform a transform matrix in column major
 * @return {boolean} whether to transform the rect as well
 * @protected
 */
gfd.ArtElement.prototype.updateTransformImpl = function(transform)
{
  return false;
};

/**
 * Causes the object to appear selected.
 * @param {gfd.Selection=} opt_selection a selection object.
 */
gfd.ArtElement.prototype.select = function(opt_selection) {};

/**
 * Causes the object to appear deselected.
 * @param {gfd.Selection=} opt_selection a selection object.
 */
gfd.ArtElement.prototype.deselect = function(opt_selection) {};

/**
 * Subclasses should stop any internal animations not controlled by the update
 * method here.
 * @protected
 */
gfd.ArtElement.prototype.freeze = function() {};

/**
 * Subclasses should restart any animations stopped in the freeze method.
 * @protected
 */
gfd.ArtElement.prototype.unfreeze = function() {};

/**
 * Implementations can override this method to init their object on its first
 * add to the stage. This is only called once the first time the object is
 * actually used so its a good way to defer expensive objects until they are
 * actually needed.
 * @protected
 */
gfd.ArtElement.prototype.load = function() {};

/**
 * Subclasses can override this to provide data arrays that should be modified
 * by functions such as transformDataPoints
 * @param {Array.<gfd.Point>} points a point array to add points or arrays of
 *                                   points to.
 * @protected
 */
gfd.ArtElement.prototype.collectDataPoints = function(points) {};