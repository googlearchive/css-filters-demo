/**
 * @fileoverview Handles logic for dealing with the background of the ArtBoard,
 * allows choosing the background based off a mode.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Background');

goog.require('gfd.ArtElement');
goog.require('gfd.EffectsDelegate');
goog.require('gfd.ImageArtElement');
goog.require('gfd.Rectangle');
goog.require('gfd.VideoArtElement');

/**
 * An element that controls the background of the canvas.
 * @param {Object} an artboard that we are the background of
 * @constructor
 */
gfd.Background = function(artBoard, effectsDelegate)
{
  /**
   * @type {Object}
   * @private
   */
  this.artBoard_ = artBoard;
  
  /**
   * @type {gfd.EffectsDelegate}
   * @private
   */
  this.effectsDelegate_ = effectsDelegate;
  
  /**
   * The current art element used for the background.
   * @type {gfd.ArtElement?}
   * @private
   */
  this.artEl_ = null;
  
  /**
   * The background sizing info.
   * @type {gfd.Rectangle}
   * @private
   */
  this.rect_ = new gfd.Rectangle(0, 0, 100, 100);
  
  /**
   * The current background mode
   * @type {gfd.Background.Mode}
   * @private
   */
  this.mode_ = gfd.Background.Mode.NONE;
  
  /**
   * A cache for saving background art elements that may be reused later so
   * they don't have to be recreated.
   * @type {Object.<string,gfd.ArtElement>}
   * @private
   */
  this.cache_ = {};
};

/**
 * @enum {string}
 */
gfd.Background.Mode = {
   NONE: 'none',
   LIGHT: 'light',
   DARK: 'dark',
   WOOD: 'wood',
   PAPER: 'paper',
   VIDEO: 'video',
   GLSL: 'glsl'
};


/**
 * Called when the background should be resized. Not really used since we
 * decided on a fixed background.
 * @param {number} width
 * @param {number} height
 */
gfd.Background.prototype.resize = function(width, height)
{
  this.rect_.width = width;
  this.rect_.height = height;
  
  if (this.artEl_) this.artEl_.setRect(this.rect_);
};


/**
 * Creates a background for the given mode. This should only be called once
 * per mode since backgrounds get cached.
 * @param {gfd.Background.Mode} mode
 * @returns {gfd.ArtElement|string}
 * @private
 */
gfd.Background.prototype.createBackgroundForMode_ = function(mode)
{
  var newArtEl;
  
  switch (mode)
  {
    case gfd.Background.Mode.DARK:
      return 'dark';
      
    case gfd.Background.Mode.LIGHT:
      return 'light';
      
    case gfd.Background.Mode.PAPER:
      newArtEl = new gfd.ImageArtElement().
        init(new gfd.Rectangle(0, 0, this.artBoard_.getWidth(),
                                     this.artBoard_.getHeight()));
      newArtEl.setSource('images/paper_pattern.png', 'repeat');
      newArtEl.setUserData('theme', 'light');
      break;
      
    case gfd.Background.Mode.WOOD:
      newArtEl = new gfd.ImageArtElement().
        init(new gfd.Rectangle(0, 0, this.artBoard_.getWidth(),
                                     this.artBoard_.getHeight()));
      newArtEl.setSource('images/wood_pattern.png', 'repeat');
      newArtEl.setUserData('theme', 'light');
      break;
    
    case gfd.Background.Mode.VIDEO:
      newArtEl = new gfd.VideoArtElement().
        init(new gfd.Rectangle(0, 0, this.artBoard_.getWidth(), 
                                     this.artBoard_.getHeight()));
      newArtEl.setSource('videos/rost.mp4');
      newArtEl.setUserData('theme', 'dark');
      break;
      
    case gfd.Background.Mode.GLSL:
      // TODO: Create a shader toy
      break;
  }
  
  return newArtEl;
};

/**
 * Returns the current background mode.
 * @returns {gfd.Background.Mode}
 */
gfd.Background.prototype.getMode = function()
{
  return this.mode_;
};

/**
 * Sets the current background mode.
 * @param {gfd.Background.Mode} mode
 * @param {string=} opt_effect
 */
gfd.Background.prototype.setMode = function(mode, opt_effect)
{
  if (mode != this.mode_)
  {
    // Dispose of the old background
    var oldArtEl = this.artEl_;
    var newArtEl = this.cache_[mode];

    if (!newArtEl)
    {
      newArtEl = this.createBackgroundForMode_(mode);
      if (newArtEl)  this.cache_[mode] = newArtEl;
    }
    
    // Dispose effects for the old one, maybe this isn't necessary?
    if (oldArtEl)
    {
      this.effectsDelegate_.applyEffectToArtElement(oldArtEl, null);
    }
    
    this.setArtElement_(newArtEl);

    // Apply Effect to new one, don't apply to images, its confusing
    if (newArtEl instanceof gfd.ArtElement && !(newArtEl instanceof gfd.ImageArtElement))
    {
      if (opt_effect)
      {
        this.effectsDelegate_.applyEffectToArtElement(newArtEl, opt_effect);
      }
      else
      {
        this.effectsDelegate_.applyRandomEffectToArtElement(newArtEl);
      }
    }

    this.mode_ = mode;
  }
};


/**
 * Returns the art element used for this mode.
 * @returns {gfd.ArtElement}
 */
gfd.Background.prototype.getArtElement = function()
{
  return this.artEl_;
};

/**
 * Sets the art element
 * @param {gfd.ArtElement} artEl
 * @private
 */
gfd.Background.prototype.setArtElement_ = function(var_args)
{
  if (this.artEl_)
  {
    this.artBoard_.removeArtElement(this.artEl_);
    this.artEl_.release();
  }
  
  var artEl = var_args instanceof gfd.ArtElement ? var_args : null;
  var theme = artEl ? artEl.getUserData('theme') : ((typeof var_args === 'string') ? var_args : null);
  

  if (this.artEl_ = artEl)
  {
    this.artEl_.retain();
    this.artEl_.setDepth(0);
    this.artBoard_.addArtElement(this.artEl_);
    this.resize(this.rect_.width, this.rect_.height);
  }
  
  if (theme)
  {
    this.artBoard_.setTheme(theme);
  }
};