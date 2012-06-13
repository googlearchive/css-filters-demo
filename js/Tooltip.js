/**
 * @fileoverview A custom tooltip, no longer used.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Tooltip');

goog.require('goog.ui.Tooltip');

/**
 * @constructor
 * @extends {goog.ui.Tooltip}
 */
gfd.Tooltip = function(opt_el)
{
  goog.ui.Tooltip.call(this, opt_el);
};
goog.inherits(gfd.Tooltip, goog.ui.Tooltip);

/**
 * Return a Position instance for repositioning the tooltip. Override in
 * subclasses to customize the way repositioning is done.
 *
 * @param {goog.ui.Tooltip.Activation} activationType Information about what
 *    kind of event caused the popup to be shown.
 * @return {!goog.positioning.AbstractPosition} The position object used
 *    to position the tooltip.
 * @protected
 */
gfd.Tooltip.prototype.getPositioningStrategy = function(activationType) {
  return new gfd.Tooltip.ElementTooltipPosition(this.getActiveElement());
};



/**
 * Popup position implementation that positions the popup (the tooltip in this
 * case) based on the element position. It's positioned below the element to the
 * right if there's enough room to fit all of it inside the Viewport. Otherwise
 * it's displayed as far right as possible either above or below the element.
 *
 * Used to position tooltips triggered by focus changes.
 *
 * @param {Element} element The element to anchor the popup at.
 * @constructor
 * @extends {goog.positioning.AnchoredPosition}
 */
gfd.Tooltip.ElementTooltipPosition = function(element) {
  goog.positioning.AnchoredPosition.call(this, element,
      goog.positioning.Corner.TOP_LEFT);
};
goog.inherits(gfd.Tooltip.ElementTooltipPosition,
              goog.positioning.AnchoredPosition);


/**
 * Repositions the popup based on element position.
 *
 * @param {Element} element The DOM element of the popup.
 * @param {goog.positioning.Corner} popupCorner The corner of the popup element
 *     that should be positioned adjacent to the anchorElement.
 * @param {goog.math.Box=} opt_margin A margin specified in pixels.
 */
gfd.Tooltip.ElementTooltipPosition.prototype.reposition = function(
    element, popupCorner, opt_margin) {
  var offset = new goog.math.Coordinate(0, 5);

  if (goog.positioning.positionAtAnchor(this.element, this.corner, element,
          popupCorner, offset, opt_margin,
          goog.positioning.Overflow.ADJUST_X | goog.positioning.Overflow.FAIL_Y
      ) & goog.positioning.OverflowStatus.FAILED) {
    goog.positioning.positionAtAnchor(this.element,
        goog.positioning.Corner.TOP_RIGHT, element,
        goog.positioning.Corner.BOTTOM_LEFT, offset, opt_margin,
        goog.positioning.Overflow.ADJUST_X |
            goog.positioning.Overflow.ADJUST_Y);
  }
};