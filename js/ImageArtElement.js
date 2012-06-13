/**
 * @fileoverview Base Class and subclasses for ImageArtElements. These are 
 * elements that use a div and a background image. During testing I found that
 * filters are not applied to this type of element correctly. Many artifacts
 * appear. So filters are disabled for it in most of the app.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.ImageArtElement');

goog.require('gfd.ArtElement');
goog.require('gfd.Serializer');
goog.require('gfd.Serializable');

goog.require('goog.events.EventHandler');


/**
 * An ArtElement that encapsulates an Image object.
 * @param {number=} opt_allFlags
 * @constructor
 * @extends {gfd.ArtElement}
 * @implements {gfd.Serializable}
 */
gfd.ImageArtElement = function(opt_allFlags)
{
  gfd.ArtElement.call(this, 'img', opt_allFlags);

  /**
   * The path to the image.
   * @type {string}
   * @private
   */
  this.path_ = null;
  
  /**
   * The scale type 
   * @type {string}
   * @private
   */
  this.scaleMode_ = 'repeat';
  
  /**
   * Whether we need to update the path on the next cycle.
   * @type {boolean}
   * @private
   */
  this.pathUpdated_ = false;
};
goog.inherits(gfd.ImageArtElement, gfd.ArtElement);

/**
 * @const
 * @type {string}
 * @private
 */
gfd.ImageArtElement.serialId = 'imgel';

// Register for serialization engine
gfd.Serializer.registerClassForId(gfd.ImageArtElement.serialId, 
    gfd.ImageArtElement);

/** @override */
gfd.ImageArtElement.prototype.init = function()
{
  if (gfd.ArtElement.prototype.init.call(this, document.createElement('div')))
  {
    return this;
  }
};


/** @inheritDoc */
gfd.ImageArtElement.prototype.serialize = function()
{
  var obj = gfd.ArtElement.prototype.serialize.call(this);
  
  obj['path'] = this.path_;
  obj['mode'] = this.scaleMode_;
  
  return obj;
};

/** @inheritDoc */
gfd.ImageArtElement.prototype.deserialize = function(data)
{
  if (gfd.ArtElement.prototype.deserialize.call(this, data))
  {
    if (data.path)
    {
      this.setSource(data['path'], data['mode']);
    }
    
    return this.init();
  }
};

/** @inheritDoc */
gfd.ImageArtElement.prototype.getSerializationId = function()
{
  // This needs to be overriden by subclasses
  return gfd.ImageArtElement.serialId;
};


/** @override */
gfd.ImageArtElement.prototype.disposeInternal = function()
{
  this.path_ = null;
  
  gfd.ArtElement.prototype.disposeInternal.call(this);
};


/**
 * Sets the source path for the image.
 * @param {string} path
 * @param {string=} opt_mode The way the image is displayed in the background.
 * This can be contain, cover or repeat.
 */
gfd.ImageArtElement.prototype.setSource = function(path, opt_mode)
{
  if (path && path !== this.path_)
  {
    this.path_ = path;
    this.scaleMode_ = opt_mode;
    this.pathUpdated_ = true;
    this.requestRender();
  }
};

/** @override */
gfd.ImageArtElement.prototype.updateImpl = function(elapsedTimeInSeconds, flags)
{
  if (this.pathUpdated_)
  {
    this.pathUpdated_ = false;
    var el = this.getRenderEl();
    var r = this.getRect();
    
    el.style.position = 'absolute';
    el.style.width = r.width + 'px';
    el.style.height = r.height + 'px';
    
    el.style['background-image'] = 'url(' + this.path_ + ')';
    
    switch (this.scaleMode_)
    {
      case 'contain':
      case 'cover':
        el.style['background-size'] = this.scaleMode_;
        break;
      default:
        el.style['background-size'] = '';
        el.style['background-repeat'] = 'repeat';
        break;
    }
  }
  
  
  flags &= gfd.ArtElement.UpdateFlags.CLEAR_RENDER; // Clear render flag
  return flags;
};