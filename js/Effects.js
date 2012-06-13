/**
 * @fileoverview Classes for dealing with applying filters to ArtElements.
 * The idea is that one 'Effect' can be applied to an ArtElement at any time.
 * An EffectsDelegate deals with the map from ArtElement to Effect.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Effect');
goog.provide('gfd.Effects');
goog.provide('gfd.EffectDelegateEvent');
goog.provide('gfd.Filter');
goog.provide('gfd.EffectsDelegate');
goog.provide('gfd.FilterEffect');

goog.require('gfd.ArtElement');
goog.require('gfd.Serializable');
goog.require('goog.style');
goog.require('goog.Timer');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');

/**
 * @enum {string}
 */
gfd.Effects = {
  NONE: 'none',
  DOSTOEVSKY: 'dostoevsky',
  PLASMA: 'plasma',
  BLUR: 'blur',
  NEON: 'neon',
  ARCHITECT: 'architect',
  PASTELS: 'pastels',
  AIRBRUSH: 'airbrush',
  HAZE: 'haze',
  BENGLIS: 'benglis',
  XRAY: 'xray'
};

/**
 * Used by an Effect to marry an art element and effect-specific data about
 * that object
 * @param {gfd.ArtElement} artEl
 * @constructor
 */
gfd.EffectTarget = function(artEl)
{
  this.element = artEl;
  this.data = null;
  this.enabled = true;
  this.applied = false;
};

/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
gfd.Effect = function()
{
  /**
   * A map of targets
   * @type {Object.<string,gfd.EffectTarget>}
   * @private
   */
  this.targets_ = {};
  
  /**
   * @type {string}
   * @private
   */
  this.effectId_ = null;
  
  /**
   * @type {boolean}
   * @private
   */
  this.frozen_ = false;
};
goog.inherits(gfd.Effect, goog.events.EventTarget);

/**
 * Initialization function should be called immediately after creation.
 * @param {string} id a unique string id to identify this effect by.
 * @returns {gfd.Effect}
 */
gfd.Effect.prototype.init = function(id)
{
  if (id)
  {
    this.effectId_ = id;
    return this;
  }
};

/**
 * Freezes the effect by stopping any animations.
 */
gfd.Effect.prototype.freeze = function()
{
  if (!this.frozen_)
  {
    this.frozen_ = true;
    
    for (var target in this.targets_)
    {
   // Don't know if style is applied yet so can't test
      //if (goog.style.getComputedStyle(this.targets_[target].element.getDomEl(), 
      //    '-webkit-animation-name').length)
      //{
        this.targets_[target].element.getDomEl().style['-webkit-animation-play-state'] = 
          'paused';
      //}
    }
  }
};

/**
 * Unfreezes the effect by starting any animations that were stopped.
 */
gfd.Effect.prototype.unfreeze = function()
{
  if (this.frozen_)
  {
    this.frozen_ = false;
    for (var target in this.targets_)
    {
      // Don't know if style is applied yet so can't test
      //if (goog.style.getComputedStyle(this.targets_[target].element.getDomEl(), 
      //    '-webkit-animation-name').length)
      //{
        this.targets_[target].element.getDomEl().style['-webkit-animation-play-state'] = 
          'running';
      //}
    }
  }
};

/**
 * Enables the effect for the given art element.
 * @param {gfd.ArtElement} artEl
 * @param {boolean} enable
 */
gfd.Effect.prototype.enable = function(artEl, enable)
{
  var target = this.targets_[artEl.hash()];
  
  if (target)
  {
    if (target.enabled != enable)
    {
      if ((target.enabled = !!enable))
      {
        if (!target.applied)
        {
          this.applyEffectImpl(target);
          target.applied = true;
        }
      }
      else
      {
        if (target.applied)
        {
          this.removeEffectImpl(target);
          target.applied = false;
        }
      }
    }
  }
};

/**
 * Returns the effect id
 * @returns {string}
 */
gfd.Effect.prototype.getId = function()
{
  return this.effectId_;
};

/**
 * @param {gfd.ArtElement} artEl
 * @private
 */
gfd.Effect.prototype.applyEffect_ = function(artEl)
{
  var t;
  if (!this.targets_[artEl.hash()])
  {
    this.targets_[artEl.hash()] = t = new gfd.EffectTarget(artEl);
    this.applyEffectImpl(t);

    artEl.getDomEl().style['-webkit-animation-play-state'] = 
          this.frozen_ ? 'paused' : 'running';
  }
};

/**
 * @param {gfd.ArtElement} artEl
 * @private
 */
gfd.Effect.prototype.removeEffect_ = function(artEl)
{
  var t;
  if (t = this.targets_[artEl.hash()])
  {
    delete this.targets_[artEl.hash()];
    this.removeEffectImpl(t);
    t.applied = false;
  }
};

/**
 * Removes effects from all targets and removes.
 */
gfd.Effect.prototype.clear = function()
{
  for (var target in this.targets_)
  {
    this.removeEffectImpl(this.targets_[target]);
  }
  
  this.targets_ = {};
};

/**
 * Releases the effect. Sends a notification to anyone interested, namely ui.
 * @private
 */
gfd.Effect.prototype.release = function()
{
  this.dispatchEvent('release');
  this.clear();
};

/**
 * @param {gfd.EffectTarget} target
 * @protected
 */
gfd.Effect.prototype.applyEffectImpl = function(target) {};

/**
 * @param {gfd.EffectTarget} target
 * @protected
 */
gfd.Effect.prototype.removeEffectImpl = function(target) {};






/**
 * @constructor
 * @extends {goog.events.Event}
 */
gfd.EffectDelegateEvent = function(artEl, effectId)
{
  goog.events.Event.call(this, 'applied');
  
  this.artEl = artEl;
  this.effectId = effectId;
};
goog.inherits(gfd.EffectDelegateEvent, goog.events.Event);




/**
 * A general css class effect, just applies/removes a css class.
 * @constructor
 * @extends {gfd.Effect}
 */
gfd.ClassEffect = function()
{
  gfd.Effect.call(this);
  
  this.class_ = null;
};
goog.inherits(gfd.ClassEffect, gfd.Effect);

/**
 * @override
 * @param {string} type The effect type to uniquely identify the effect.
 * @param {string} cls The css class to apply.
 * @returns {gfd.ClassEffect}
 */
gfd.ClassEffect.prototype.init = function(type, cls)
{
  if (gfd.Effect.prototype.init.call(this, type))
  {
    if (cls)
    {
      this.class_ = cls;
      return this;
    }
  }
};


/**
 * Applies the effect to the element.
 * @param {gfd.EffectTarget} artEl the art element to apply the effect to.
 */
gfd.ClassEffect.prototype.applyEffectImpl = function(target)
{
  // Clear any css styles
  target.element.setFilterString('');
  // Set offset to random so things don't line up
  target.element.getDomEl().style['-webkit-animation-delay'] = (Math.random() * -10).toFixed(2) + 's';
  target.element.addClass(this.class_);
};


/**
 * Removes the effect from the element.
 * @param {gfd.EffectTarget} target
 */
gfd.ClassEffect.prototype.removeEffectImpl = function(target)
{
  target.element.removeClass(this.class_);
};

/**
 * @enum {String}
 */
gfd.FilterType = {
    HUE_ROTATE: 'hue-rotate',
    GRAYSCALE: 'grayscale',
    SEPIA: 'sepia',
    BLUR: 'blur',
    BRIGHTNESS: 'brightness',
    CONTRAST: 'contrast',
    INVERT: 'invert',
    SATURATE: 'saturate'
};

/**
 * A filter that dispatches when changed
 * @param type
 * @param opt_default
 * @param opt_min
 * @param opt_max
 * @param opt_suffix
 * @constructor
 */
gfd.Filter = function(type, opt_default, opt_min, opt_max, opt_suffix, opt_listener)
{
  var na = arguments.length;
  this.hash_ = 'f' + (++gfd.Filter.uid_);
  this.type = type;
  this.min_ = na >= 3 ? opt_min : Number.MIN_VALUE;
  this.max_ = na >= 4 ? opt_max : Number.MAX_VALUE;
  this.suffix_ = na >= 5 ? opt_suffix : '';
  this.value_ = na >= 2 ? opt_default : 0;
  this.default_ = na >= 2 ? opt_default : 0;
  this.cachedValue_ = null;
  this.listener_ = opt_listener;
};

/**
 * Unique identifier for filter hash
 * @private
 */
gfd.Filter.uid_ = 0;

/** @returns {string} the hash */
gfd.Filter.prototype.hash = function() { return this.hash_; };
/** @returns {number} min value */
gfd.Filter.prototype.getMin = function() { return this.min_; };
/** @returns {number} max value */
gfd.Filter.prototype.getMax = function() { return this.max_; };
/** @returns {number} default value */
gfd.Filter.prototype.getDefault = function() { return this.default_; };
/** @returns {number} current value */
gfd.Filter.prototype.getValue = function() { return this.value_; };
/** @param {function} l a listener probably an effect */
gfd.Filter.prototype.setListener = function(l) { this.listener_ = l; };

gfd.Filter.prototype.setValue = function(value)
{
  if (value != this.value_)
  {
    this.value_ = value;
    this.cachedValue_ = null;
    
    if (this.listener_) this.listener_(this);
  }
};

gfd.Filter.prototype.formatValue_ = function(value)
{
  return (value < this.min_ ? this.min_ : 
    (value > this.max_ ? this.max_ : 
      value)) + this.suffix_;
};

gfd.Filter.prototype.toCssString = function()
{
  // If value is near default, don't write anything out
  return this.type + '(' + (this.cachedValue_ ? this.cachedValue_ : (this.cachedValue_ = 
    this.formatValue_(this.value_))) + ')';
};

gfd.Filter.prototype.toString = function()
{
  // If value is near default, don't write anything out
  if (Math.abs(this.value_ - this.default_) < 0.01) return '';
  return this.type + '(' + (this.cachedValue_ ? this.cachedValue_ : (this.cachedValue_ = 
    this.formatValue_(this.value_))) + ')';
};


/**
 * An effect that has filter parameters per object and applies or removes
 * them based on settings.
 * @constructor
 * @implements {gfd.Serializable}
 * @extends {gfd.Effect}
 */
gfd.FilterEffect = function()
{
  gfd.Effect.call(this);
  
  var self = this;
  this.filterChain_ = [];
  this.filtersChanged_ = false;
  this.filterString_ = '';
  this.filterClosure_ = function(e) {self.filterChangedHandler_(e);};
};
goog.inherits(gfd.FilterEffect, gfd.Effect);


/**
 * Uid for creating filter effects.
 * @type {Number}
 * @private
 */
gfd.FilterEffect.uid = 0;

/**
 * @const
 * @type {string}
 */
gfd.FilterEffect.serialId = 'ffx';

//Register for serialization engine
gfd.Serializer.registerClassForId(gfd.FilterEffect.serialId, 
    gfd.FilterEffect);

/**
 * @override
 * @param {string} type the unique effect id.
 * @returns {gfd.FilterEffect}
 */
gfd.FilterEffect.prototype.init = function(type)
{
  return gfd.Effect.prototype.init.call(this, type);
};


/**
 * @inheritDoc
 */
gfd.FilterEffect.prototype.serialize = function()
{
  var filters = [];
  
  for (var i = 0; i < this.filterChain_.length; i++)
  {
    filters[i] = {'f':this.filterChain_[i].type,
                  'v':this.filterChain_[i].value_};
  }
  return {
      'e':this.effectId_,
      'f':filters
  };
};

/**
 * @inheritDoc
 */
gfd.FilterEffect.prototype.deserialize = function(data)
{
  var id = data['e'];
  var filters = data['f'];
  
  for (var i = 0; i < filters.length; i++)
  {
    var filter = this.addFilter(filters[i]['f']);
    filter.setValue(filters[i]['v']);
  }
  
  return this.init(id);
};

/**
 * @inheritDoc
 */
gfd.FilterEffect.prototype.getSerializationId = function()
{
  return gfd.FilterEffect.serialId;
};


gfd.FilterEffect.prototype.addFilter = function(type, opt_index)
{
  var filter;
  
  switch (type)
  {
    case gfd.FilterType.HUE_ROTATE: 
      filter = new gfd.Filter(type, 0, 0, 360, 'deg', this.filterClosure_); break;
    case gfd.FilterType.GRAYSCALE:
      filter = new gfd.Filter(type, 0, 0, 100, '%', this.filterClosure_); break;
    case gfd.FilterType.SEPIA:
      filter = new gfd.Filter(type, 0, 0, 100, '%', this.filterClosure_); break;
    case gfd.FilterType.SATURATE:
      filter = new gfd.Filter(type, 100, 0, 800, '%', this.filterClosure_); break;
    case gfd.FilterType.INVERT:
      filter = new gfd.Filter(type, 0, 0, 100, '%', this.filterClosure_); break;
    case gfd.FilterType.BRIGHTNESS:
      filter = new gfd.Filter(type, 0, -100, 100, '%', this.filterClosure_); break;
    case gfd.FilterType.CONTRAST:
      filter = new gfd.Filter(type, 0, 0, 800, '%', this.filterClosure_); break;
    case gfd.FilterType.BLUR:
      filter = new gfd.Filter(type, 0, 0, 100, 'px', this.filterClosure_); break;
  }
  
  if (filter)
  {
    if (arguments.length < 2 || opt_index >= this.filterChain_.length) 
    {
      this.filterChain_.push(filter);
    }
    else
    {
      this.filterChain_.splice(opt_index, 0, filter);
    }
    
    this.filterChangedHandler_(filter);
  }
  
  return filter;
};


/**
 * @override
 */
gfd.FilterEffect.prototype.release = function()
{
  for (var i = 0; i < this.filterChain_.length; i++)
  {
    this.filterChain_[i].setListener(null);
  }
  
  this.filterChain_ = null;
  
  gfd.Effect.prototype.release.call(this);
};

gfd.FilterEffect.prototype.filterChangedHandler_ = function(filter)
{
  var self = this;
  
  if (!this.filtersChanged_)
  {
    this.filtersChanged_ = true;
    goog.Timer.callOnce(function(){self.updateFilters_();});
  }
};

gfd.FilterEffect.prototype.moveFilterBeforeById = function(id, nextId)
{
  // Find the indexes in the filter chain
  var index1 = -1;
  var index2 = -1;
  
  for (var i = this.filterChain_.length - 1; i >= 0; --i)
  {
    if (index1 < 0 && this.filterChain_[i].type === id)
    {
      index1 = i;
      if (index2 >= 0) break;
      else continue;
    }
    
    if (index2 < 0 && this.filterChain_[i].type === nextId)
    {
      index2 = i;
      if (index1 >= 0) break;
    }
  }
  
  if (index1 >= 0 && index2 >= 0)
  {
    var f = this.filterChain_[index1];
    this.filterChain_.splice(index1, 1);
    this.filterChain_.splice(index2, 0, f);
    this.updateFilters_();
  }
};

gfd.FilterEffect.prototype.updateFilters_ = function()
{
  this.filtersChanged_ = false;
  
  this.filterString_ = this.filterChain_.join(' ');
  
  for (var target in this.targets_)
  {
    if (this.targets_[target].enabled)
    {
      this.targets_[target].element.setFilterString(this.filterString_);
    }
  }
};

/**
 * Applies the effect to the element.
 * @param {gfd.EffectTarget} target the target
 */
gfd.FilterEffect.prototype.applyEffectImpl = function(target)
{
  target.element.setFilterString(this.filterString_);
};

gfd.FilterEffect.prototype.removeEffectImpl = function(target)
{
  // Restore its filter parameters
  target.element.setFilterString('');
};



/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
gfd.EffectsDelegate = function()
{
  /**
   * An array of all effects by id
   * @type {Object.<string, gfd.Effect>}
   * @private
   */
  this.effects_ = {};
  
  /**
   * Custom effects also contained in effects, but separated here.
   * @type {Object.<string, gfd.Effect>}
   * @private
   */
  this.customEffects_ = {};
  
  /**
   * Keep track of number of effects
   * @returns {number}
   */
  this.numEffects_ = -1;
  
  /**
   * Whether animations are permanently disabled.
   * @type {boolean}
   * @private
   */
  this.disabledAnimations_ = false;
  
  /**
   * Whether effects are frozen.
   * @type {boolean}
   * @private
   */
  this.frozen_ = false;

};
goog.inherits(gfd.EffectsDelegate, goog.events.EventTarget);


/**
 * Returns the number of effects this delegate manages.
 * @returns {number}
 */
gfd.EffectsDelegate.prototype.getNumEffects = function()
{
  if (this.numEffects_ < 0)
  {
    this.numEffects_ = 0;
    for (var e in gfd.Effects)
    {
      this.numEffects_++;
    }
  }
  
  return this.numEffects_;
};

gfd.EffectsDelegate.prototype.disableAnimations = function()
{
  if (!this.disabledAnimations_)
  {
    this.disabledAnimations_ = true;
    this.freeze();
  }
  
};


/**
 * Returns the effect at a given index. This is mainly for randomly selecting
 * an effect.
 * @param {number} index
 * @returns {gfd.Effect}
 */
gfd.EffectsDelegate.prototype.getEffectIdAt = function(index)
{
  for (var effectId in gfd.Effects)
  {
    if (index-- === 0)
    {
      return gfd.Effects[effectId];
    }
  }
};


/**
 * Freezes all effects by stopping animations.
 */
gfd.EffectsDelegate.prototype.freeze = function()
{
  // Freeze all effects
  if (!this.frozen_)
  {
    this.frozen_ = true;
    for (var effect in this.effects_)
    {
      this.effects_[effect].freeze();
    }
  }
};

/**
 * Unfreezes all effects by restarting animations.
 */
gfd.EffectsDelegate.prototype.unfreeze = function()
{
  if (!this.disabledAnimations_)
  {
    if (this.frozen_)
    {
      this.frozen_ = false;
      for (var effect in this.effects_)
      {
        this.effects_[effect].unfreeze();
      }
    }
  }
};

/**
 * Creates a custom filter effect.
 * @returns {gfd.FilterEffect}
 */
gfd.EffectsDelegate.prototype.createFilterEffect = function()
{
  var effect = new gfd.FilterEffect().init('ffx' + (++gfd.FilterEffect.uid));
  if (this.addFilterEffect(effect)) return effect;
};

/**
 * Adds a given effect.
 * @param effect
 * @returns {boolean}
 */
gfd.EffectsDelegate.prototype.addFilterEffect = function(effect)
{
  if (effect)
  {
    var id = effect.effectId_;
    var uid = parseInt(id.substr(3),10);
    if (uid >= gfd.FilterEffect.uid) gfd.FilterEffect.uid = uid + 1;
    if (!this.effects_[id])
    {
      this.effects_[id] = effect;
      this.customEffects_[id] = effect;
      return true;
    }
  }
  
  return false;
};

/**
 * Releases the effect.
 * @param {gfd.Effect} effect
 */
gfd.EffectsDelegate.prototype.releaseEffect = function(effect)
{
  var effectId = effect instanceof gfd.Effect ? effect.effectId_ : effect;

  if (effect = this.customEffects_[effectId])
  {
    effect.release();
    delete this.effects_[effectsId];
    delete this.customEffects_[effectsId];
  }
};

/** 
 * Remove all targets and delete any custom effects
 */
gfd.EffectsDelegate.prototype.clear = function()
{
  for (var effectId in this.effects_)
  {
    this.effects_[effectId].clear();
  };
  
  for (var effectId in this.customEffects_)
  {
    this.effects_[effectId].release();
    delete this.effects_[effectId];
  }
  
  this.customEffects_ = {};
};

/**
 * Gets an array of any effects that were custom added.
 * @returns {Array.<gfd.Effect>}
 */
gfd.EffectsDelegate.prototype.getCustomEffects = function()
{
  var effects = [];
  for (var effect in this.customEffects_)
  {
    effects.push(this.customEffects_[effect]);
  }
  
  return effects;
};

/**
 * Returns the map from artElement hash to effectId
 * @returns {Object.<string, string>}
 */
gfd.EffectsDelegate.prototype.getEffectMap = function()
{
  var map = {};
  for (var effectId in this.effects_)
  {
    for (var target in this.effects_[effectId].targets_)
    {
      map[target] = effectId;
    }
  };
  
  return map;
};

/**
 * Returns an effect given its string id.
 * @param {string} id
 * @returns {gfd.Effect}
 */
gfd.EffectsDelegate.prototype.getEffectById = function(id)
{
  if (this.effects_[id]) return this.effects_[id];
  
  var effect;
  for (var effectId in gfd.Effects)
  {
    if (gfd.Effects[effectId] === id)
    {
      effect = new gfd.ClassEffect().init(id, 'gfd-effect-' + gfd.Effects[effectId]);
      if (this.frozen_)
      {
        effect.freeze();
      }
      break;
    }
  }
  
  if (effect) this.effects_[id] = effect;
  return effect;
};


/**
 * Enables or disables the effect applied to the art element if any.
 * @param {gfd.ArtElement} artEl
 * @param {boolean} enable
 */
gfd.EffectsDelegate.prototype.enableEffectsForArtElement = function(artEl, enable)
{
  var effect = this.getEffectByArtElement(artEl);
  
  if (effect)
  {
    effect.enable(artEl, enable);
  }
};

/**
 * Applies a random effect to the art element using the standard random.
 * @param {gfd.ArtElement} artEl
 */
gfd.EffectsDelegate.prototype.applyRandomEffectToArtElement = function(artEl)
{
  //Apply a random effect to it
  var c = this.getEffectIdAt(
      ((Math.random() * this.getNumEffects()) | 0));
  
  this.applyEffectToArtElement(artEl, c);
};

/**
 * Applies the effect to the given art element, or if null removes all effects.
 * @type {gfd.ArtElement} artEl
 * @type {string|gfd.Effect=} opt_effect
 */
gfd.EffectsDelegate.prototype.applyEffectToArtElement = function(artEl, opt_effect)
{
  var newEffect = !opt_effect ? null : (opt_effect instanceof gfd.Effect ? 
      opt_effect : this.getEffectById(opt_effect));
  
  // Does the element already have an effect applied to it
  var oldEffect = this.getEffectByArtElement(artEl);
  
  if (oldEffect === newEffect) return;
  if (oldEffect)
  {
    oldEffect.removeEffect_(artEl);
    if (!newEffect)
    {
      goog.events.unlisten(artEl, 'dispose', this.artElementWasDisposed_);
    }
  }
  if (newEffect) 
  {
    newEffect.applyEffect_(artEl);
    
    this.dispatchEvent(new gfd.EffectDelegateEvent(artEl, newEffect.effectId_));
    
    if (!oldEffect)
    {
      goog.events.listen(artEl, 'dispose', this.artElementWasDisposed_, false, this);
    }
  }
};

/**
 * Called when an art element dispatches its dispose event so we can remove
 * all filters and remove it from the map.
 * @param {goog.events.Event} e
 */
gfd.EffectsDelegate.prototype.artElementWasDisposed_ = function(e)
{
  // Make sure its removed
  this.applyEffectToArtElement(e.target, null);
};


/**
 * Returns the effect applied to the art element if any.
 * @param {gfd.ArtElement} artEl
 * @returns {gfd.Effect}
 */
gfd.EffectsDelegate.prototype.getEffectByArtElement = function(artEl)
{
  for (var id in this.effects_)
  {
    if (this.effects_[id].targets_[artEl.hash()])
    {
      return this.effects_[id];
    }
  }
  
  return null;
};

