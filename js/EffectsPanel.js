/**
 * @fileoverview The popup UI Element for the effects panel.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.EffectInfo');
goog.provide('gfd.EffectsPanel');
goog.provide('gfd.EffectsPanelDragEvent');

goog.require('goog.fx.DragDrop');
goog.require('goog.fx.DragDropGroup');
goog.require('goog.dom');
goog.require('goog.events.EventTarget');
goog.require('goog.events.Event');
goog.require('goog.ui.AnimatedZippyUp');
goog.require('goog.ui.Zippy');
goog.require('gfd.FilterEffect');
goog.require('goog.ui.Slider');

/**
 * Effect Info pulled from the dom.
 * @param {string} name of the effect
 * @param {string} css the css representation
 * @param {string} desc a description
 * @constructor
 */
gfd.EffectInfo = function(name, css, desc)
{
  this.name = name;
  this.css = css;
  this.desc = desc;
};

/**
 * @param effect
 * @param x
 * @param y
 * @constructor
 * @extends {goog.events.Event}
 */
gfd.EffectsPanelDragEvent = function(effect, x, y, opt_target)
{
  goog.events.Event.call(this, 'effect', opt_target);

  this.effect = effect;
  this.clientX = x;
  this.clientY = y;
};
goog.inherits(gfd.EffectsPanelDragEvent, goog.events.Event);


/**
 * @param effect
 * @param param
 * @param value
 * @constructor
 * @extends {goog.events.Event}
 */
gfd.EffectsPanelParamEvent = function(effect, param, value)
{
  goog.events.Event.call(this, 'param');

  this.effect = effect;
  this.param = param;
  this.value = value;
};
goog.inherits(gfd.EffectsPanelParamEvent, goog.events.Event);

/**
 * @constructor
 * @extends {goog.events.EventTarget}
 */
gfd.EffectsPanel = function()
{
  goog.events.EventTarget.call(this);

  /**
   * @type {goog.ui.AnimatedZippy}
   * @private
   */
  this.effectsZippy_ = null;
  
  /**
   * An array of effects.
   * @type {Array.<Object>}
   * @private
   */
  this.effects_ = [];
  
  /**
   * An array of effect info.
   * @type {Array.<gfd.EffectInfo>}
   * @private
   */
  this.effectInfo_ = {};
  
  /**
   * Element to drop effects onto.
   * @type {Element}
   * @private
   */
  this.dropZone_ = null;
};
goog.inherits(gfd.EffectsPanel, goog.events.EventTarget);

/**
 * Creates an effect to display in the panel.
 * @param {gfd.Effect} effect
 * @param {string} name
 * @param {Element=} opt_el
 * @param {string=} opt_content
 * @returns {Object}
 */
gfd.EffectsPanel.prototype.createEffect = function(effect, name, opt_el, opt_content)
{
  var self = this, zippy, container, header, content, result, drag;
  // Swap the effect with an openable panel

  if (!opt_el)
  {
    container = goog.dom.createDom('div', 'gfd-effect-item',
        opt_el = header = goog.dom.createDom('div', 'gfd-effect-header', name),
        content = goog.dom.createDom('div', 'gfd-effect-content', opt_content || ''));
    
    zippy = new goog.ui.AnimatedZippy(header, content);
    goog.events.listen(zippy, goog.ui.Zippy.Events.ACTION, 
        function(e){self.subActionHandler_(e);});
  }

  drag = new goog.fx.DragDrop(opt_el, effect);
  drag.setDragClass('gfd-drag-effect');
  drag.addTarget(this.dropZone_);
  goog.events.listen(drag, 'dragstart', this.dragStartHandler_, false, this);
  drag.init();
  
  this.effects_.push(result = { zippy:zippy, 
                                drag:drag, 
                                container:container, 
                                header:header, 
                                content:content, 
                                effect:effect, 
                                dragGroup:null});
  
  return result;
};

/**
 * Dragging was started, close the zippy.
 * @param {goog.events.Event} e
 */
gfd.EffectsPanel.prototype.dragStartHandler_ = function(e)
{
  this.effectsZippy_.collapse();
};

/**
 * Cleanup.
 * @param {Object} effectData
 */
gfd.EffectsPanel.prototype.destroyEffect = function(effectData)
{
  if (effectData.zippy) effectData.zippy.dispose();
  if (effectData.drag) effectData.drag.dispose();
  goog.events.unlisten(effectData.drag, 'dragstart', this.dragStartHandler_);
  effectData.drag = null;
  effectData.zippy = null;
  effectData.container = null;
  effectData.header = null;
  effectData.content = null;
  effectData.effect = null;
  
  for (var i = 0; i < this.effects_.length; i++)
  {
    if (this.effects_[i] === effectData)
    {
      this.effects_.splice(i, 1);
      break;
    }
  }
  
};

/**
 * A lot of the complication here is for something that has been stripped.
 * @param {gfd.Effect} effect
 */
gfd.EffectsPanel.prototype.addEffect = function(effect)
{
  var self = this, i, filter, sliderDiv, labelSpan, sliderData, sliderListener, 
    filterType, sliderDragDrop, effectItemData;
  
  // Create a new effect ui object
  effectItemData = this.createEffect(effect.getId(), 'Custom Effect');
  effectItemData.filterData = [];
  
  //effectItemData.dragTarget = new goog.fx.DragDrop(effectItemData.content);
  effectItemData.dragGroup = new goog.fx.DragDropGroup();
  
  goog.events.listen(effectItemData.dragGroup, 'drop', function(e)
  {
    var p = e.dragSourceItem.element.parentNode;
    p.removeChild(e.dragSourceItem.element);
    p.insertBefore(e.dragSourceItem.element, e.dropTargetItem.element);
    effect.moveFilterBeforeById(e.dragSourceItem.data, e.dropTargetItem.data);
  });
  // Create a slider for each parameter
  for (filterType in gfd.FilterType)
  {
    // Create the filter in the effect (this modifies the actual effect not ui)
    filter = effect.addFilter(gfd.FilterType[filterType]);
    // Create a div for the slider
    sliderDiv = goog.dom.createDom('div', 'gfd-effect-filter');
    // Allow that div to be draggable within
    effectItemData.dragGroup.addItem(sliderDiv, gfd.FilterType[filterType]);
    // Create a little label for the type
    labelSpan = goog.dom.createDom('span', 'gfd-effect-filter-label');
    // Create the actual slider and hook it to the filter
    sliderData = this.createSlider(filter, labelSpan);
    // Render the slider into the div
    sliderData.slider.render(sliderDiv);
    sliderDiv.insertBefore(labelSpan,sliderDiv.firstChild);

    // Add the div to the content
    effectItemData.content.appendChild(sliderDiv);
    effectItemData.filterData.push({filter:filter, sliderData:sliderData});
  }
  
  effectItemData.dragGroup.addTarget(effectItemData.dragGroup);
  effectItemData.dragGroup.init();
  
  filter = sliderDiv = labelSpan = slider = filterType = sliderData = 
    sliderDragDrop = null;

  // Listen to the effect so we can destroy it when it gets released
  goog.events.listen(effect, 'release', 
      function(e) {
        // Clear all the slider data
        for (i = effectItemData.filterData.length - 1; i >= 0; i--)
        {
          goog.events.unlisten(effectItemData.filterData[i].sliderData.slider,
                               goog.ui.Component.EventType.CHANGE,
                               effectItemData.filterData[i].sliderData.listener);
          goog.events.unlisten(effectItemData.filterData[i].sliderData.slider.getValueThumb(),
                              'mousedown', effectItemData.filterData[i].sliderData.mlistener);
          effectItemData.filterData[i].sliderData.slider.dispose();
          effectItemData.dragGroup.dispose();
          //effectItemData.dragTarget.dispose();
          effectItemData.filterData[i].sliderData = null;
          effectItemData.filterData[i].filter = null;
        }

        effectItemData.container.parentNode.removeChild(effectItemData.container);
        self.destroyEffect(effectItemData);
       
        effectItemData = null;
     });
  
  //Finally add the effect object to the DOM
  goog.dom.query('#gfd-effects .gfd-options-content')[0].
    appendChild(effectItemData.container);

  // And open it
  this.subActionHandler_(null, effectItemData.zippy);
  effectItemData.zippy.expand();
  
  //Need to call this after since offsetWidth, etc are not updated yet
  goog.Timer.callOnce(function(e) {
    if (effectItemData) {
      var fd = effectItemData.filterData;
      for (i = fd.length - 1; i >= 0; --i)
      {
        // Set the slider at its initial position so it is in line with the 
        // default filter setting. Because these ui elements are not so great, we 
        // actually need to call to setValue twice since it misreads a setting of 
        // 0 as no change, this is kind of sorry for a decent library.
        fd[i].sliderData.slider.setValue(fd[i].filter.getDefault() + 
            (fd[i].filter.getMax() - fd[i].filter.getDefault()) / 2);
        fd[i].sliderData.slider.setValue(fd[i].filter.getDefault());
      }
    }
  });
};

/**
 * Not used.
 * @param filter
 * @param labelEl
 * @returns {Object}
 */
gfd.EffectsPanel.prototype.createSlider = function(filter, labelEl)
{
  // Create a slider
  var l, ml, s = new goog.ui.Slider();
  s.setMinimum(filter.getMin());
  s.setMaximum(filter.getMax());
  s.createDom();
  s.setStep(1);
  
  goog.events.listen(s.getValueThumb(), 'mousedown', ml = function(e)
  {
    e.stopPropagation();
  });;
  
  // Connect the slider to the filter so when it changes we get updates
  goog.events.listen(s, goog.ui.Component.EventType.CHANGE, l = 
    function(e) {
     filter.setValue(s.getValue());
     labelEl.innerHTML = filter.toCssString();
  });
  
  return {slider:s, listener: l, mlistener: ml};
};


/**
 * Initializes the toolbar by adding everything to the dom.
 * @param {Element} dropZoneEl
 */
gfd.EffectsPanel.prototype.init = function(dropZoneEl)
{
  var c, self = this;
  var temp;
  if (goog.dom.getElement('gfd-effects') && dropZoneEl)
  {
    this.dropZone_ = new goog.fx.DragDrop(dropZoneEl, 'artboard');
    
    this.effectsZippy_ = new goog.ui.AnimatedZippyUp(
        goog.dom.query('#gfd-effects .gfd-options-header')[0], 
        c = goog.dom.query('#gfd-effects .gfd-options-content')[0], false);
  
    goog.array.forEach(goog.dom.query('[data-effect]',c),
       function(o) {
        var effectItemData = self.createEffect(o.getAttribute('data-effect'),
            o.innerHTML, o);
        
        if (effectItemData.container)
        {
          o.parentNode.replaceChild(effectItemData.container, o);
        }
        
        self.effectInfo_[o.getAttribute('data-effect')] = new gfd.EffectInfo(
            o.innerHTML, o.getAttribute('data-css'), o.getAttribute('data-tooltip'));
     });
  
    temp = goog.dom.getElement('gfd-effects-header-add');
    if (temp)
    {
      goog.events.listen(temp,
          'click', this.addEffectHandler_, false, this);
    }
  
    goog.events.listen(this.dropZone_, 'drop', 
        this.effectDroppedHandler_, false, this);
    
    c = null;
  }
};

/**
 * @param {string} effectId
 * @returns {Object}
 */
gfd.EffectsPanel.prototype.getEffectInfoForId = function(effectId)
{
  return this.effectInfo_[effectId];
  
};

/**
 * @param {goog.events.Event} e
 * @param {Object=} opt_target
 * @private
 */
gfd.EffectsPanel.prototype.subActionHandler_ = function(e, opt_target)
{
  opt_target = opt_target || e.target;
  
  for (var i = 0; i < this.effects_.length; i++)
  {
    if (this.effects_[i].zippy && this.effects_[i].zippy != opt_target) 
    {
      this.effects_[i].zippy.collapse();
    }
  }
};

/**
 * @param {goog.events.Event} e
 * @private
 */
gfd.EffectsPanel.prototype.addEffectHandler_ = function(e)
{
  e.stopPropagation();
  this.dispatchEvent('add');
};

/**
 * @param {goog.events.Event} e
 * @private
 */
gfd.EffectsPanel.prototype.effectDroppedHandler_ = function(e) {
  this.dispatchEvent(new gfd.EffectsPanelDragEvent(e.dragSourceItem.data, 
      e.clientX, e.clientY));
};
