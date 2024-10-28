'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FilterEdgeTypeSubstriber = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _utils = require('$:/plugins/felixhayashi/tiddlymap/js/utils');

var _utils2 = _interopRequireDefault(_utils);

var _AbstractMagicEdgeTypeSubscriber = require('$:/plugins/felixhayashi/tiddlymap/js/AbstractMagicEdgeTypeSubscriber');

var _AbstractMagicEdgeTypeSubscriber2 = _interopRequireDefault(_AbstractMagicEdgeTypeSubscriber);

var _widget = require('$:/core/modules/widgets/widget.js');

var _widget2 = _interopRequireDefault(_widget);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; } /* @preserve TW-Guard */
/*\

title: $:/plugins/felixhayashi/tiddlymap/js/modules/edge-type-handler/filter
type: application/javascript
module-type: tmap.edgetypehandler

@preserve

\*/
/* @preserve TW-Guard */

/*** Imports *******************************************************/

/*** Code **********************************************************/

/**
 * The FilterEdgeTypeSubstriber deals with connections that are stored inside
 * tiddler fields via a dynamic filter.
 *
 * @see http://tiddlymap.org/#tw-filter
 * @see https://github.com/felixhayashi/TW5-TiddlyMap/issues/206
 */
var FilterEdgeTypeSubstriber = function (_AbstractMagicEdgeTyp) {
  _inherits(FilterEdgeTypeSubstriber, _AbstractMagicEdgeTyp);

  /**
   * @inheritDoc
   */
  function FilterEdgeTypeSubstriber(allEdgeTypes) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, FilterEdgeTypeSubstriber);

    return _possibleConstructorReturn(this, (FilterEdgeTypeSubstriber.__proto__ || Object.getPrototypeOf(FilterEdgeTypeSubstriber)).call(this, allEdgeTypes, _extends({ priority: 10 }, options)));
  }

  /**
   * @inheritDoc
   */


  _createClass(FilterEdgeTypeSubstriber, [{
    key: 'canHandle',
    value: function canHandle(edgeType) {

      return edgeType.namespace === 'tw-filter';
    }

    /**
     * @override
     */

  }, {
    key: 'getReferencesFromField',
    value: function getReferencesFromField(tObj, fieldName, toWL) {

      var filter = tObj.fields[fieldName];

      return runFilter(filter, tObj.fields.title, toWL);
    }

    /**
     * Stores and maybe overrides an edge in this tiddler
     */

  }, {
    key: 'insertEdge',
    value: function insertEdge(tObj, edge, type) {

      if (!edge.to) {
        return;
      }

      // get the name without the private marker or the namespace
      var name = type.name;
      var toTRef = this.tracker.getTiddlerById(edge.to);
      var currentTiddler = tObj.fields.title;
      var filterString = tObj.fields[name] || "";

      // We don't want to add the title if it's already a filter result.
      while (runFilter(filterString, currentTiddler).indexOf(toTRef) < 0) {
        var filterTree = $tw.wiki.parseFilter(filterString);
        var found = false;

        // Search backwards for any explicit removal of the target Ref
        // Otherwise, we might get `... -toTRef toTRef`
        for (var i = filterTree.length - 1; i >= 0; i--) {
          var run = filterTree[i];
          var title = runIsSingleTitle(run);
          if (run.prefix === "-" && title === toTRef) {
            // We found an explicit removal. Remove the removal.
            filterTree.splice(i, 1);
            found = true;
            break;
          }
        }

        if (!found) {
          // We didn't find an explicit removal (expected), so we add the title
          // to the list.
          filterTree.push({ prefix: "", operators: [{ operator: "title", operands: [{ text: toTRef }] }] });
        }

        filterString = reassembleFilter(filterTree);
        // Now we go back around and try again to make sure it actually took.
      }

      // save
      _utils2.default.setField(tObj, name, filterString);

      return edge;
    }
  }, {
    key: 'deleteEdge',


    /**
     * Deletes an edge in this tiddler
     */
    value: function deleteEdge(tObj, edge, type) {

      // transform
      var name = type.name;
      var toTRef = this.tracker.getTiddlerById(edge.to);
      var currentTiddler = tObj.fields.title;
      var filterString = tObj.fields[name];

      // We don't want to remove a title that's not already there
      while (filterString && runFilter(filterString, currentTiddler).indexOf(toTRef) >= 0) {
        var filterTree = $tw.wiki.parseFilter(tObj.fields[name]);
        var found = false;

        for (var i = 0; i < filterTree.length; i++) {
          var run = filterTree[i];
          var title = runIsSingleTitle(run);
          if (!run.prefix && title === toTRef) {
            // This is the title we're looking for. Remove it.
            filterTree.splice(i, 1);
            found = true;
            break;
          }
        }

        if (!found) {
          // We couldn't find it. So it must be a complicated filter. We'll put in
          // a manual removal.
          filterTree.push({ prefix: "-", operators: [{ operator: "title", operands: [{ text: toTRef }] }] });
        }

        filterString = reassembleFilter(filterTree);
        // Now we do it again to make sure it was actually removed
      }

      // save
      _utils2.default.setField(tObj, name, filterString);

      return edge;
    }
  }]);

  return FilterEdgeTypeSubstriber;
}(_AbstractMagicEdgeTypeSubscriber2.default);

/*** Utility *******************************************************/

function reassembleFilter(parseTree) {

  // This will hold all of the filter parts
  var fragments = [];
  // Rebuild the filter.
  for (var i = 0; i < parseTree.length; i++) {
    var run = parseTree[i];
    if (fragments.length > 0) {
      fragments.push(" ");
    }
    fragments.push(run.prefix);
    var title = runIsSingleTitle(run);
    if (title) {
      fragments.push(bestQuoteFor(title));
    } else if (run.operators.length > 0) {
      fragments.push("[");
      for (var j = 0; j < run.operators.length; j++) {
        var op = run.operators[j];
        var firstOperand = true;
        if (op.prefix) {
          fragments.push(op.prefix);
        }
        if (op.operator !== "title" || op.suffix) {
          fragments.push(op.operator);
        }
        if (op.suffix) {
          fragments.push(':', op.suffix);
        }
        if (op.regexp) {
          fragments.push("/", op.regexp.source, "/");
          if (op.regexp.flags) {
            fragments.push("(", op.regexp.flags, ")");
          }
        } else {
          for (var k = 0; k < op.operands.length; k++) {
            var operand = op.operands[k];
            if (!firstOperand) {
              fragments.push(',');
            }
            firstOperand = false;
            if (operand.variable) {
              fragments.push('<', operand.text, '>');
            } else if (operand.indirect) {
              fragments.push('{', operand.text, '}');
            } else {
              fragments.push('[', operand.text, ']');
            }
          }
        }
      }
      fragments.push(']');
    }
  }
  // Return compiled filter string, if there is one
  if (fragments.length > 0) {
    return fragments.join("");
  }

  return undefined;
};

/**
 * If this is a single title, return the title, otherwise null
 */
function runIsSingleTitle(run) {

  if (run.operators.length === 1 && !run.namedPrefix) {
    var op = run.operators[0];
    if (op.operator === "title" && op.operands.length === 1 && !op.suffix && !op.prefix) {
      var operand = op.operands[0];
      if (!operand.variable && !operand.indirect) {
        return operand.text;
      }
    }
  }
  return null;
};

/**
 * Returns title wrapped in quotes if necessary.
 */
function bestQuoteFor(title) {

  if (/^[^\s\[\]\-+~=:'"][^\s\[\]]*$/.test(title)) {
    return title;
  }
  if (title.indexOf("]") < 0) {
    return "[[" + title + "]]";
  }
  if (title.indexOf("'") < 0) {
    return "'" + title + "'";
  }
  return '"' + title + '"';
};

/**
 * Runs a filter and returns an array of the results.
 * Ensures currentTiddler is set.
 */
function runFilter(filterString, currentTiddler, toWL) {

  // Solves https://github.com/felixhayashi/TW5-TiddlyMap/issues/278
  var parentWidget = new _widget2.default.widget({});
  parentWidget.setVariable("currentTiddler", currentTiddler);
  var widget = new _widget2.default.widget({}, { "parentWidget": parentWidget });
  //noinspection UnnecessaryLocalVariableJS
  var toRefs = _utils2.default.getMatches(filterString, toWL, widget);

  return toRefs;
}

/*** Exports *******************************************************/

exports.FilterEdgeTypeSubstriber = FilterEdgeTypeSubstriber;