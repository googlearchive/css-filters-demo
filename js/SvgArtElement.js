/**
 * @fileoverview Base class and sublcasses for art elements that use SVG as
 * a base rendering element.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.SvgArtElement');
goog.provide('gfd.SvgGestureShapeElement');

goog.require('gfd.ArtElement');
goog.require('gfd.Color');
goog.require('gfd.Constants');
goog.require('gfd.Palette');
goog.require('gfd.Point');
goog.require('gfd.Random');
goog.require('gfd.RandomPalette');
goog.require('gfd.Rectangle');
goog.require('gfd.Serializer');

goog.require('goog.Timer');


/**
 * An ArtElement that uses an SVG Document as its base. This was done very fast
 * so there is not optimization for modifying colors etc just using the dom,
 * instead everything just runs through the render method which is probably
 * slow.
 * @param {Number=} opt_allFlags subclass update flag masks.
 * @constructor
 * @extends {gfd.ArtElement}
 */
gfd.SvgArtElement = function(opt_allFlags)
{
  gfd.ArtElement.call(this, 'svg', opt_allFlags);
  
  this.svgRoot_ = null;
  this.svgDefs_ = null;
  this.svgRect_ = null;
  this.selected_ = false;
};
goog.inherits(gfd.SvgArtElement, gfd.ArtElement);


/**
 * A factory method for creating SvgArtElements so as to not overload
 * resources.
 * @param {gfd.ArtElement.FactoryDelegate} factoryDelegate
 * @param {function(new: gfd.SvgArtElement)} svgClass
 * @returns
 */
gfd.SvgArtElement.create = function(factoryDelegate, svgClass)
{
  // See if we have proper resources for creating the object
  if (!gfd.SvgArtElement.pool_.length)
  {
    // If this fails it will be created but with no animation
    factoryDelegate.removeLruOfClass(gfd.SvgArtElement);
  }
    
  return new svgClass();
};

/**
 * Utility function to create svg elements with the correct namespace.
 * @param {string} name the element name.
 * @private
 */
gfd.SvgArtElement.createEl = function(name)
{
  return document.createElementNS('http://www.w3.org/2000/svg', name);
};



//TODO: cleanup this hack, but its chromes fault!
/**
 * @type {Array.<Element>}
 * @private
 */
gfd.SvgArtElement.pool_ = [];


/**
 * Preloads svg documents so animation works, this seems to only work if its
 * called from the window onload listener.
 */
gfd.SvgArtElement.preload = function()
{
  for (var i = 0; i < gfd.Constants.MAX_SVG_CONTAINERS; i++)
  {
    var svgDoc = gfd.SvgArtElement.createEl('svg');
    gfd.SvgArtElement.pool_[i] = svgDoc;
    document.body.appendChild(svgDoc);
  }
  
  goog.Timer.callOnce(function()
  {
    for (var i = 0; i < gfd.Constants.MAX_SVG_CONTAINERS; i++)
    {
      document.body.removeChild(gfd.SvgArtElement.pool_[i]);
    }
  }, 50);
};


/** @override */
gfd.SvgArtElement.prototype.freeze = function()
{
  this.getRenderEl().pauseAnimations();
};


/** @override */
gfd.SvgArtElement.prototype.unfreeze = function()
{
  this.getRenderEl().unpauseAnimations();
};


/** @override */
gfd.SvgArtElement.prototype.init = function(opt_rect)
{
  var pooledItem = gfd.SvgArtElement.pool_.length ? 
      gfd.SvgArtElement.pool_.pop() : gfd.SvgArtElement.createEl('svg');

  if (gfd.ArtElement.prototype.init.call(this, 
      pooledItem))
  {
    this.svgRect_ = this.getRenderEl().createSVGRect();
    this.svgRect_.width = this.svgRect_.height = 1;
    if (opt_rect) this.setRect(opt_rect);
    return this;
  }
};


/** @override */
gfd.SvgArtElement.prototype.disposeInternal = function()
{
  var svg = this.getRenderEl();
  
  if (svg)
  {
    while (svg.hasChildNodes()) svg.removeChild(svg.lastChild);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    gfd.SvgArtElement.pool_.push(svg);
  }
  
  if (this.svgRoot_)
  {
    while (this.svgRoot_.hasChildNodes()) this.svgRoot_.removeChild(this.svgRoot_.lastChild);
  }
  
  if (this.svgDefs_)
  {
    while (this.svgDefs_.hasChildNodes()) this.svgDefs_.removeChild(this.svgDefs_.lastChild);
  }
  
  this.svgRoot_ = null;
  this.svgDefs_ = null;
  this.svgRect_ = null;
  
  
  gfd.ArtElement.prototype.disposeInternal.call(this);
};

/** @override */
gfd.SvgArtElement.prototype.updateTransformImpl = function(transform)
{
  return true;
};


/** @inheritDoc */
gfd.SvgArtElement.prototype.serialize = function()
{
  return gfd.ArtElement.prototype.serialize.call(this);
};

/** @inheritDoc */
gfd.SvgArtElement.prototype.deserialize = function(data)
{
  return gfd.ArtElement.prototype.deserialize.call(this, data);
};


/** @override */
gfd.SvgArtElement.prototype.updateRectImpl = function(oldRect, newRect)
{
  this.getRenderEl().setAttribute('width', newRect.width + 'px');
  this.getRenderEl().setAttribute('height', newRect.height + 'px');
  //this.svgRoot_.setAttribute('transform', 'translate(' + (-newRect.x) + ',' + -newRect.y + ')');
};


/** @override */
gfd.SvgArtElement.prototype.load = function()
{
  var rootSvg = this.getRenderEl();
  rootSvg.setAttribute('version', '1.2');
  rootSvg.setAttribute('baseProfile', 'tiny');
  this.svgDefs_ = gfd.SvgArtElement.createEl('defs');
  this.svgRoot_ = gfd.SvgArtElement.createEl('g');
  
  var r = this.getRect();
  this.svgRoot_.setAttribute('transform', 'translate(' + (-r.x) + ',' + -r.y + ')');
  rootSvg.appendChild(this.svgDefs_);
  rootSvg.appendChild(this.svgRoot_);
};


/** @override */
gfd.SvgArtElement.prototype.hit = function(x, y, opt_selection)
{
  var r = this.getRect();
  this.svgRect_.x = x - r.x;
  this.svgRect_.y = y - r.y;
  return this.getRenderEl().getIntersectionList(this.svgRect_, null).length > 0;
  
};


/** @override */
gfd.SvgArtElement.prototype.select = function(selection)
{
  if (!this.selected_)
  {
    this.selected_ = true;
    // Doing the request render is wasteful, should just change color
    // directly here
    this.requestRender();
  }
};


/** @override */
gfd.SvgArtElement.prototype.deselect = function(selection)
{
  if (this.selected_)
  {
    this.selected_ = false;
    // Doing the request render is wasteful, should just change color
    // directly here
    this.requestRender();
  }
};



/**
 * An ArtElement that encapsulates an SVG Docuent.
 * @constructor
 * @extends {gfd.SvgArtElement}
 * @implements {gfd.Serializable}
 */
gfd.SvgGestureShapeElement = function()
{
  gfd.SvgArtElement.call(this);
  
  /**
   * @type{string}
   * @private
   */
  this.paletteName_ = null;
  
  /**
   * @type {gfd.RandomPalette}
   * @private
   */
  this.palette_ = null;
  
  /**
   * @type {Array.<gfd.Point}
   * @private
   */
  this.points_ = null;
  
  /**
   * @type {string}
   * @private
   */
  this.gesture_ = null;
  
  /**
   * @type {Array.<Element>}
   * @private
   */
  this.paths_ = [];

};
goog.inherits(gfd.SvgGestureShapeElement, gfd.SvgArtElement);

/**
 * @const
 * @type {string}
 */
gfd.SvgGestureShapeElement.serialId = 'svggs';

//Register for serialization engine
gfd.Serializer.registerClassForId(gfd.SvgGestureShapeElement.serialId, 
    gfd.SvgGestureShapeElement);


/** @override */
gfd.SvgGestureShapeElement.prototype.setPaletteName = function(p)
{
  if (p !== this.paletteName_)
  {
    this.paletteName_ = p;
    this.requestRender();
  }
};


/**
 * @param {string} gestureType not currently used
 * @param {gfd.Rectangle=} opt_rect a rectangle for generating the area
 * @param {Array.<gfd.Point>=} opt_points points for generating the rect from
 * @param {number=} opt_paletteSeed a seed for generating pseudo random indexes
 */
gfd.SvgGestureShapeElement.prototype.initWithData = function(gestureType, 
    opt_rect, opt_points, opt_paletteSeed)
{
  if (opt_rect)
  {
    // Force it to be a square
    if (opt_rect.width < opt_rect.height)
    {
      opt_rect.x -= Math.round((opt_rect.height - opt_rect.width) / 2);
      opt_rect.width = opt_rect.height;
    }
    else
    {
      opt_rect.y -= Math.round((opt_rect.width - opt_rect.height) / 2);
      opt_rect.height = opt_rect.width;
    }
  }
  
  if (gfd.SvgArtElement.prototype.init.call(this, opt_rect))
  {
    // Push last point
    this.points_ = opt_points;
    this.gesture_ = gestureType;
    this.palette_ = new gfd.RandomPalette(opt_paletteSeed);
    return this;
  }
};


/** @inheritDoc */
gfd.SvgGestureShapeElement.prototype.serialize = function()
{
  var obj = gfd.SvgArtElement.prototype.serialize.call(this);
  
  obj['pts'] = gfd.Point.flattenArray(this.points_);
  obj['palsd'] = this.palette_.getSeed();
  
  return obj;
};


/** @inheritDoc */
gfd.SvgGestureShapeElement.prototype.deserialize = function(data)
{
  if (gfd.SvgArtElement.prototype.deserialize.call(this, data))
  {
    return this.initWithData('none',
                              null, 
                              gfd.Point.unflattenArray(data['pts']),
                              data['palsd']);
  }
};


/** @inheritDoc */
gfd.SvgGestureShapeElement.prototype.getSerializationId = function()
{
  return gfd.SvgGestureShapeElement.serialId;
};


/** @override */
gfd.SvgGestureShapeElement.prototype.disposeInternal = function()
{
  this.paths_ = null;
  this.palette_.dispose();
  this.palette_ = null;
  
  gfd.SvgArtElement.prototype.disposeInternal.call(this);
};


/** @override */
gfd.SvgGestureShapeElement.prototype.load = function()
{
  gfd.SvgArtElement.prototype.load.call(this);
  
  // Setup svg
  var ngon = 4;
  var angle = 2 * Math.PI / ngon;
  var size = 1;
 
  var r = this.getRect();
  var cx = r.x + r.width * 0.5;
  var cy = r.y + r.height * 0.5;
  var maxSize = (r.width < r.height ? r.width : r.height) / 2;
  
  var group = gfd.SvgArtElement.createEl('g');
  group.setAttribute('transform', 'translate(' + cx + ',' + cy + ')');

  gfd.Random.seed(this.palette_.getSeed());
  
  var l = this.points_.length;
  for (var i = 0; i < l; i++)
  {
    if (gfd.Random.next() > 0.4) continue;
    var dx = i === 0 ? 1 : this.points_[i].x - this.points_[i-1].x;
    var dy = i === 0 ? 1 : this.points_[i].y - this.points_[i-1].y;
    size = (l-i)/l * maxSize;;
    var r = Math.atan2(dy,dx) * 180 / Math.PI;
    
    var angled = 180 / ngon;
    r = angled + Math.round(r / angled) * angled;
    div = 360 / angled;
    var path = gfd.SvgArtElement.createEl('polygon');
    path.setAttribute('transform', 'rotate(' + r + ')');


    var anim;

    anim = gfd.SvgArtElement.createEl('animateTransform');
    anim.setAttribute('attributeName', 'transform');
    anim.setAttribute('attributeType', 'xml');
    anim.setAttribute('type', 'scale');
    anim.setAttribute('values', '0; 1; 0');
    anim.setAttribute('begin',  (4 * (i%div)/div) + 's');
    anim.setAttribute('calcMode', 'spline');
    anim.setAttribute('keyTimes', '0; 0.5; 1');
    anim.setAttribute('keySplines', '.5 0 .5 1; .5 0 .5 1');
    anim.setAttribute('dur', '4s');
    anim.setAttribute('additive', 'sum');
    anim.setAttribute('repeatCount', 'indefinite');
    path.appendChild(anim);
 

    var ps = '';
    for (var j = 0; j < ngon; j++)
    {
     ps += ' ' + ((Math.sin(angle * j) * size)) + ',' +
                 ((Math.cos(angle * j) * size));
    }
    
    path.setAttribute('points', ps);
    this.paths_.push(path);
    group.appendChild(path);
  }
  this.svgRoot_.appendChild(group);
  
  this.getRenderEl().setCurrentTime(1000);
};


/** @override */
gfd.SvgGestureShapeElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  var palette = gfd.Palette.getPaletteByName(this.paletteName_);

  // Colorize the paths
  for (var i = this.paths_.length - 1; i >= 0; --i)
  {
    var col = this.selected_ ? gfd.Color.WHITE.toCssColorString() : 
      this.palette_.getColorString(palette, i);
    
    this.paths_[i].setAttribute('fill', col);
  }
  
  if (this.selected_) this.getRenderEl().pauseAnimations();

  flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER; // Clear render flag
  return flags;
};

