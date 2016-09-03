/*  This code is a port of functions from http://commons.apache.org/proper/commons-math/

	Original license of used code:

	Licensed to the Apache Software Foundation (ASF) under one or more
	contributor license agreements.  See the NOTICE file distributed with
	this work for additional information regarding copyright ownership.
	The ASF licenses this file to You under the Apache License, Version 2.0
	(the "License"); you may not use this file except in compliance with
	the License.  You may obtain a copy of the License at

		 http://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.

	*/
/* globals module */
'use strict';
var chiSquareTest = (function(){
	// Lanczos coefficients
	var LANCZOS = [
		  0.99999999999999709182,
		 57.156235665862923517,
		-59.597960355475491248,
		 14.136097974741747174,
		 -0.49191381609762019978,
		  0.33994649984811888699e-4,
		  0.46523628927048575665e-4,
		 -0.98374475304879564677e-4,
		  0.15808870322491248884e-3,
		 -0.021026444172410488319e-3,
		  0.21743961811521264320e-3,
		 -0.16431810653676389022e-3,
		  0.84418223983852743293e-4,
		 -0.26190838401581408670e-4,
		  0.36899182659531622704e-5,
		],
		// Avoid repeated computation of log of 2 PI in logGamma
		HALF_LOG_2_PI = 0.5 * Math.log(2.0 * Math.PI),
		// Maximum allowed numerical error.
		DEFAULT_EPSILON = 10e-15;

	/**
	 * Returns the natural logarithm of the gamma function &#915;(x).
	 *
	 * The implementation of this method is based on:
	 * <ul>
	 * <li><a href="http://mathworld.wolfram.com/GammaFunction.html">
	 * Gamma Function</a>, equation (28).</li>
	 * <li><a href="http://mathworld.wolfram.com/LanczosApproximation.html">
	 * Lanczos Approximation</a>, equations (1) through (5).</li>
	 * <li><a href="http://my.fit.edu/~gabdo/gamma.txt">Paul Godfrey, A note on
	 * the computation of the convergent Lanczos complex Gamma approximation
	 * </a></li>
	 * </ul>
	 *
	 * @param x Value.
	 * @return log(&#915;(x))
	 */
	function logGamma(x) {
		var i, tmp, sum;

		if (isNaN(x) || (x <= 0)) {
			return NaN;
		}

		sum = LANCZOS[0];
		for (i = 1; i < LANCZOS.length; i++) {
			sum += (LANCZOS[i] / (x + i));
		}

		tmp = x + 0.5 + (607 / 128);
		return ((x + 0.5) * Math.log(tmp)) - tmp + HALF_LOG_2_PI + Math.log(sum / x);
	}

	/**
	 * Returns the regularized gamma function P(a, x).
	 *
	 * @param a Parameter.
	 * @param x Value.
	 * @return the regularized gamma function P(a, x).
	 * @throws MaxCountExceededException if the algorithm fails to converge.
	 */
	function regularizedGammaP(a, x) {
		return _regularizedGammaP(a, x, DEFAULT_EPSILON, Math.pow(2, 32) - 1);
	}

	/**
	 * Returns the regularized gamma function P(a, x).
	 *
	 * The implementation of this method is based on:
	 * <ul>
	 *  <li>
	 *   <a href="http://mathworld.wolfram.com/RegularizedGammaFunction.html">
	 *   Regularized Gamma Function</a>, equation (1)
	 *  </li>
	 *  <li>
	 *   <a href="http://mathworld.wolfram.com/IncompleteGammaFunction.html">
	 *   Incomplete Gamma Function</a>, equation (4).
	 *  </li>
	 *  <li>
	 *   <a href="http://mathworld.wolfram.com/ConfluentHypergeometricFunctionoftheFirstKind.html">
	 *   Confluent Hypergeometric Function of the First Kind</a>, equation (1).
	 *  </li>
	 * </ul>
	 *
	 * @param a the a parameter.
	 * @param x the value.
	 * @param epsilon When the absolute value of the nth item in the
	 * series is less than epsilon the approximation ceases to calculate
	 * further elements in the series.
	 * @param maxIterations Maximum number of "iterations" to complete.
	 * @return the regularized gamma function P(a, x)
	 * @throws MaxCountExceededException if the algorithm fails to converge.
	 */
	function _regularizedGammaP(a, x, epsilon, maxIterations) {
		if (isNaN(a) || isNaN(x) || a <= 0 || x < 0) {
			return NaN;
		}

		if (x === 0) {
			return 0;
		}

		if (x >= a + 1) {
			// use regularizedGammaQ because it should converge faster in this case.
			return 1.0 - _regularizedGammaQ(a, x, epsilon, maxIterations);
		}

		// calculate series
		var n = 0,      // current element index
			an = 1 / a, // n-th element in the series
			sum = an;   // partial sum

		while (Math.abs(an/sum) > epsilon && n < maxIterations && sum < Infinity) {
			// compute next element in the series
			n = n + 1.0;
			an = an * (x / (a + n));

			// update partial sum
			sum = sum + an;
		}

		if (!isFinite(sum)) {
			return 1;
		}

		return Math.exp(-x + (a * Math.log(x)) - logGamma(a)) * sum;
	}

	/**
	 * Returns the regularized gamma function Q(a, x) = 1 - P(a, x).
	 *
	 * The implementation of this method is based on:
	 * <ul>
	 *  <li>
	 *   <a href="http://mathworld.wolfram.com/RegularizedGammaFunction.html">
	 *   Regularized Gamma Function</a>, equation (1).
	 *  </li>
	 *  <li>
	 *   <a href="http://functions.wolfram.com/GammaBetaErf/GammaRegularized/10/0003/">
	 *   Regularized incomplete gamma function: Continued fraction representations
	 *   (formula 06.08.10.0003)</a>
	 *  </li>
	 * </ul>
	 *
	 * @param a the a parameter.
	 * @param x the value.
	 * @param epsilon When the absolute value of the nth item in the
	 * series is less than epsilon the approximation ceases to calculate
	 * further elements in the series.
	 * @param maxIterations Maximum number of "iterations" to complete.
	 * @return the regularized gamma function P(a, x)
	 * @throws MaxCountExceededException if the algorithm fails to converge.
	 */
	function _regularizedGammaQ(a, x, epsilon, maxIterations) {
		var ret;

		if (isNaN(a) || isNaN(x) || a <= 0 || x < 0) {
			return NaN;
		}

		if (x === 0) {
			return 1;
		}

		if (x < a + 1) {
			// use regularizedGammaP because it should converge faster in this case.
			return 1 - _regularizedGammaP(a, x, epsilon, maxIterations);
		}

		ret = 1.0 / _continuedFraction(x, epsilon, maxIterations,
			function(n, x){return ((2.0 * n) + 1.0) - a + x;},
			function(n){return n * (a - n);}
			);

		return Math.exp(-x + (a * Math.log(x)) - logGamma(a)) * ret;
	}

	/**
	 * <p>
	 * Evaluates the continued fraction at the value x.
	 * </p>
	 *
	 * <p>
	 * The implementation of this method is based on equations 14-17 of:
	 * <ul>
	 * <li>
	 *   Eric W. Weisstein. "Continued Fraction." From MathWorld--A Wolfram Web
	 *   Resource. <a target="_blank"
	 *   href="http://mathworld.wolfram.com/ContinuedFraction.html">
	 *   http://mathworld.wolfram.com/ContinuedFraction.html</a>
	 * </li>
	 * </ul>
	 * The recurrence relationship defined in those equations can result in
	 * very large intermediate results which can result in numerical overflow.
	 * As a means to combat these overflow conditions, the intermediate results
	 * are scaled whenever they threaten to become numerically unstable.</p>
	 *
	 * @param x the evaluation point.
	 * @param epsilon maximum error allowed.
	 * @param maxIterations maximum number of convergents
	 * @return the value of the continued fraction evaluated at x.
	 * @throws ConvergenceException if the algorithm fails to converge.
	 */
	function _continuedFraction(x, epsilon, maxIterations, getA, getB) {
		var p0 = 1,
			p1 = getA(0, x),
			q0 = 0,
			q1 = 1,
			c = p1 / q1,
			n = 0,
			relativeError = Number.MAX_VALUE;

		while (n < maxIterations && relativeError > epsilon) {
			++n;
			var a = getA(n, x),
				b = getB(n, x),
				p2 = a * p1 + b * p0,
				q2 = a * q1 + b * q0,
				infinite = false;

			if (!isFinite(p2) || !isFinite(q2)) {
				/*
				 * Need to scale. Try successive powers of the larger of a or b
				 * up to 5th power. Throw ConvergenceException if one or both
				 * of p2, q2 still overflow.
				 */
				var scaleFactor = 1,
					lastScaleFactor = 1,
					maxPower = 5,
					scale = Math.max(a,b);

				if (scale <= 0) {
					throw "Can't scale";
				}

				infinite = true;
				for (var i = 0; i < maxPower; i++) {
					lastScaleFactor = scaleFactor;
					scaleFactor *= scale;
					if (a !== 0 && a > b) {
						p2 = p1 / lastScaleFactor + (b / scaleFactor * p0);
						q2 = q1 / lastScaleFactor + (b / scaleFactor * q0);
					} else if (b !== 0) {
						p2 = (a / scaleFactor * p1) + p0 / lastScaleFactor;
						q2 = (a / scaleFactor * q1) + q0 / lastScaleFactor;
					}
					infinite = !isFinite(p2) || !isFinite(q2);
					if (!infinite) {
						break;
					}
				}
			}

			if (infinite) {
			   throw "Can't scale";
			}

			var r = p2 / q2;

			if (isNaN(r)) {
				throw "NaN divergence";
			}

			relativeError = Math.abs(r / c - 1.0);

			// prepare for next iteration
			c = p2 / q2;
			p0 = p1;
			p1 = p2;
			q0 = q1;
			q1 = q2;
		}

		if (n >= maxIterations) {
			throw "Non convergent";
		}

		return c;
	}

	/**
	 * {@inheritDoc}
	 *
	 * The implementation of this method is based on:
	 * <ul>
	 *  <li>
	 *   <a href="http://mathworld.wolfram.com/Chi-SquaredDistribution.html">
	 *    Chi-Squared Distribution</a>, equation (9).
	 *  </li>
	 *  <li>Casella, G., & Berger, R. (1990). <i>Statistical Inference</i>.
	 *    Belmont, CA: Duxbury Press.
	 *  </li>
	 * </ul>
	 */
	function cumulativeProbability(x, degreesOfFreedom) {
		if (x <= 0) {
			return 0;
		}

		return regularizedGammaP(degreesOfFreedom / 2, x / 2);
	}

	/**
	 * Check all entries of the input array are strictly positive.
	 *
	 * @param arr Array to be tested.
	 * @exception MathIllegalArgumentException if one entry is not positive.
	 */
	function checkPositive(arr) {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] <= 0) {
				throw "NOT_POSITIVE_ELEMENT_AT_INDEX " + i;
			}
		}
	}

	/**
	 * Check all entries of the input array are >= 0.
	 *
	 * @param arr Array to be tested.
	 * @exception MathIllegalArgumentException if one entry is negative.
	 */
	function checkNonNegative(arr) {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] < 0) {
				throw "NEGATIVE_ELEMENT_AT_INDEX " + i;
			}
		}
	}

	/**
	 * {@inheritDoc}
	 * <p><strong>Note: </strong>This implementation rescales the
	 * <code>expected</code> array if necessary to ensure that the sum of the
	 * expected and observed counts are equal.</p>
	 *
	 * @param observed array of observed frequency counts
	 * @param expected array of expected frequency counts
	 * @return chi-square test statistic
	 * @throws DimensionMismatchException if the arrays length is less than 2.
	 */
	function chiSquare(expected, observed) {

		if (expected.length < 2) {
			throw "Dimension mismatch";
		}

		if (expected.length != observed.length) {
			throw "Dimension not equal";
		}

		checkPositive(expected);
		checkNonNegative(observed);

		var sumExpected = 0,
			sumObserved = 0,
			i;

		for (i = 0; i < observed.length; i++) {
			sumExpected += expected[i];
			sumObserved += observed[i];
		}
		var ratio = 1,
			rescale = false;

		if (Math.abs(sumExpected - sumObserved) > 10E-6) {
			ratio = sumObserved / sumExpected;
			rescale = true;
		}

		var sumSq = 0, dev;
		for (i = 0; i < observed.length; i++) {
			if (rescale) {
				dev = observed[i] - ratio * expected[i];
				sumSq += dev * dev / (ratio * expected[i]);
			} else {
				dev = observed[i] - expected[i];
				sumSq += dev * dev / expected[i];
			}
		}

		return sumSq;
	}

	/**
	 * {@inheritDoc}
	 * <p><strong>Note: </strong>This implementation rescales the
	 * <code>expected</code> array if necessary to ensure that the sum of the
	 * expected and observed counts are equal.</p>
	 *
	 * @param observed array of observed frequency counts
	 * @param expected array of expected frequency counts
	 * @return p-value
	 * @throws MathIllegalArgumentException if preconditions are not met
	 * @throws MathException if an error occurs computing the p-value
	 */
	return function(expected, observed){
		return 1 - cumulativeProbability(chiSquare(expected, observed), expected.length - 1);
	};
})();

if (typeof module != "undefined" && typeof module.exports != "undefined") module.exports = chiSquareTest;
