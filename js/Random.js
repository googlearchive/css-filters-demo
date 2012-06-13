/**
 * @fileoverview Wrapper for pseudo random generator.
 * 
 * @author dan@leftfieldlabs.com (Dan Riley)
 */

goog.provide('gfd.Random');

goog.require('goog.testing.PseudoRandom');

/**
 * @private
 * @type {goog.testing.PseudoRandom}
 */
gfd.Random.random_ = new goog.testing.PseudoRandom();

/**
 * Returns the next random number from the pseudo generator.
 */
gfd.Random.next = function(){return gfd.Random.random_.random();};

/**
 * Seeds the psedu generator.
 */
gfd.Random.seed = function(s){gfd.Random.random_.seed(s);};