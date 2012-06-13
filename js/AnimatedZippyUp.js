/**
 * @fileoverview Hacked animated zippy that goes up instead of down. It was
 * done fast so don't try to reuse this.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('goog.ui.AnimatedZippyUp');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.fx.Animation');
goog.require('goog.fx.Animation.EventType');
goog.require('goog.fx.Transition.EventType');
goog.require('goog.fx.easing');
goog.require('goog.Timer');
goog.require('goog.ui.Zippy');
goog.require('goog.ui.ZippyEvent');



/**
 * This is a hacked Animated Zippy that goes up instead of down. It was done
 * real fast so don't try to reuse this!
 *
 * @param {Element|string|null} header Header element, either element
 *     reference, string id or null if no header exists.
 * @param {Element|string} content Content element, either element reference or
 *     string id.
 * @param {boolean=} opt_expanded Initial expanded/visibility state. Defaults to
 *     false.
 * @constructor
 * @extends {goog.ui.Zippy}
 */
goog.ui.AnimatedZippyUp = function(header, content, opt_expanded) {
  // Create wrapper element and move content into it.
  var container = header.parentNode;
  var elWrapper = goog.dom.createDom('div', {'style': 'overflow:hidden;'});
  var elContent = goog.dom.getElement(content);
  elContent.parentNode.replaceChild(elWrapper, elContent);
  elWrapper.appendChild(elContent);
  
  this.minHeight_ = header.offsetHeight;
  container.style['min-height'] = this.minHeight_ + 'px';
  container.style['position'] = 'absolute';
  elContent.style['padding-bottom'] = this.minHeight_ + 'px';

  header.style.position = 'absolute';
  header.style.bottom = '0px';
  
  this.timer_ = new goog.Timer(1000);
  goog.events.listen(this.timer_, 'tick', this.mouseOutTimerHandler_, false, this);
  goog.events.listen(container, 'mouseout', this.mouseOutHandler_, false, this);
  goog.events.listen(container, 'mouseover', this.mouseOverHandler_, false, this);

  this.collapsing_ = false;
  this.el_ = container;
  /**
   * Content wrapper, used for animation.
   * @type {Element}
   * @private
   */
  this.elWrapper_ = elWrapper;

  /**
   * Reference to animation or null if animation is not active.
   * @type {goog.fx.Animation}
   * @private
   */
  this.anim_ = null;

  // Call constructor of super class.
  goog.ui.Zippy.call(this, header, elContent, opt_expanded);

  // Set initial state.
  // NOTE: Set the class names as well otherwise animated zippys
  // start with empty class names.
  var expanded = this.isExpanded();
  this.elWrapper_.style.display = expanded ? '' : 'none';
  this.updateHeaderClassName(expanded);
  
  // Temporary hack
  goog.ui.AnimatedZippyUp.zippies_.push(this);
};
goog.inherits(goog.ui.AnimatedZippyUp, goog.ui.Zippy);


goog.ui.AnimatedZippyUp.zippies_ = [];

/**
 * Duration of expand/collapse animation, in milliseconds.
 * @type {number}
 */
goog.ui.AnimatedZippyUp.prototype.animationDuration = 500;


/**
 * Acceleration function for expand/collapse animation.
 * @type {!Function}
 */
goog.ui.AnimatedZippyUp.prototype.animationAcceleration = goog.fx.easing.easeOut;


/**
 * @return {boolean} Whether the zippy is in the process of being expanded or
 *     collapsed.
 */
goog.ui.AnimatedZippyUp.prototype.isBusy = function() {
  return this.anim_ != null;
};


goog.ui.AnimatedZippyUp.prototype.mouseOutHandler_ = function(e)
{
  this.timer_.stop();
  this.timer_.start();
  
};

goog.ui.AnimatedZippyUp.prototype.mouseOutTimerHandler_ = function(e)
{
  this.timer_.stop();
  if (!this.collapsing_)
    this.collapse();
};

goog.ui.AnimatedZippyUp.prototype.mouseOverHandler_ = function(e)
{
  this.timer_.stop();
};

/**
 * Sets expanded state.
 *
 * @param {boolean} expanded Expanded/visibility state.
 */
goog.ui.AnimatedZippyUp.prototype.setExpanded = function(expanded) {
  if (this.isExpanded() == expanded && !this.anim_) {
    return;
  }
  
  this.collapsing_ = !expanded;

  // Reset display property of wrapper to allow content element to be
  // measured.
  if (this.elWrapper_.style.display == 'none') {
    this.elWrapper_.style.display = '';
  }

  // Measure content element.
  var h = this.getContentElement().offsetHeight - this.minHeight_;

  // Stop active animation (if any) and determine starting height.
  var startH = 0;
  if (this.anim_) {
    expanded = this.isExpanded();
    goog.events.removeAll(this.anim_);
    this.anim_.stop(false);

    var marginTop = parseInt(this.getContentElement().style.marginTop, 10);// - this.minHeight_;
    startH = marginTop + h;
  } else {
    startH = expanded ? 0 : h;
  }

  // Updates header class name after the animation has been stopped.
  this.updateHeaderClassName(expanded);

  // Set up expand/collapse animation.
  this.anim_ = new goog.fx.Animation([0, startH],
                                     [0, expanded ? h : 0],
                                     this.animationDuration,
                                     this.animationAcceleration);

  var events = [goog.fx.Transition.EventType.BEGIN,
                goog.fx.Animation.EventType.ANIMATE,
                goog.fx.Transition.EventType.END];
  goog.events.listen(this.anim_, events, this.onAnimate_, false, this);
  goog.events.listen(this.anim_,
                     goog.fx.Transition.EventType.END,
                     goog.bind(this.onAnimationCompleted_, this, expanded));

  if (expanded)
  {
    // Collapse any other ones
    for (var i = 0; i < goog.ui.AnimatedZippyUp.zippies_.length; i++)
    {
      if (goog.ui.AnimatedZippyUp.zippies_[i] !== this)
      {
        if (!goog.ui.AnimatedZippyUp.zippies_[i].collapsing_)
        {
          goog.ui.AnimatedZippyUp.zippies_[i].collapse();
        }
      }
    }
  }
  // Start animation.
  this.anim_.play(false);
};


/**
 * Called during animation
 *
 * @param {goog.events.Event} e The event.
 * @private
 */
goog.ui.AnimatedZippyUp.prototype.onAnimate_ = function(e) {
  var h = this.getContentElement().offsetHeight - this.minHeight_;
  var y = Math.round(e.y);
  this.getContentElement().style.marginTop = (y - h) + 'px';
  this.el_.style.top = (-y) + 'px';
};


/**
 * Called once the expand/collapse animation has completed.
 *
 * @param {boolean} expanded Expanded/visibility state.
 * @private
 */
goog.ui.AnimatedZippyUp.prototype.onAnimationCompleted_ = function(expanded) {
  // Fix wrong end position if the content has changed during the animation.
  if (expanded) {
    var h = this.getContentElement().offsetHeight;
    this.getContentElement().style.marginTop = '0px';
    this.el_.style.top = this.minHeight_-h;
  }
  else
  {
    this.el_.style.top = '0px';
  }

  this.collapsing_ = false;
  goog.events.removeAll(this.anim_);
  this.setExpandedInternal(expanded);
  this.anim_ = null;

  if (!expanded) {
    this.elWrapper_.style.display = 'none';
  }

  // Fire toggle event.
  this.dispatchEvent(new goog.ui.ZippyEvent(goog.ui.Zippy.Events.TOGGLE,
                                            this, expanded));
};