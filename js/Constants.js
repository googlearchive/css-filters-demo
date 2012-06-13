/**
 * @fileoverview Constants used in the Google CSS Filter Demo project.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Constants');

/**
 * The version. Not sure if this has any meaning but maybe in the future.
 * @type {number}
 */
gfd.Constants.GFD_VERSION = 1;

/**
 * The maximum number of bytes to let canvases use. Just calculated by
 * width * height * 4
 * @type {number}
 */
gfd.Constants.MAX_CANVAS_BYTES = 12000000;


/**
 * The maximum number of elements on the artboard at once.
 * @type {number}
 */
gfd.Constants.MAX_ARTBOARD_ELEMENTS = 50;


/**
 * The ideal frame rate to run at.
 * @type {number}
 */
gfd.Constants.GOAL_FRAME_RATE = 60;


/**
 * An unacceptable frame rate, at which we start deleting objects.
 * @type {number}
 */
gfd.Constants.BAD_FRAME_RATE = 15;

/**
 * Check the frame rate every x seconds to see if it has become a 'bad' frame
 * rate.
 * @type {number}
 */
gfd.Constants.FRAME_RATE_CHECK_INTERVAL_S = 5;


/**
 * Number of frame rate checks that the frame rate must be below the bad
 * frame rate level before we dispatch warnings to the controller.
 * @type {number}
 */
gfd.Constants.BAD_FRAME_RATE_HYST = 3;


/**
 * Maximum number of svg containers. This is because of a bug in chrome you
 * have to allocate svg containers on window load, otherwise animation
 * doesn't work.
 * @type {number}
 */
gfd.Constants.MAX_SVG_CONTAINERS = 8;


/**
 * Maximum number of webgl contexts before we start removing/caching older
 * ones. This is because too many contexts means lost contexts.
 * @type {number}
 */
gfd.Constants.MAX_WEBGL_CANVASES = 6;


/**
 * Maximum number of points to allow in a single stroke. This is just to keep
 * from data getting to big.
 * @type {number}
 */
gfd.Constants.MAX_DRAW_POINTS = 512;

/**
 * Whether a random effect is automatically applied to the drawn object.
 * @type {boolean}
 */
gfd.Constants.AUTO_APPLY_EFFECTS = true;
