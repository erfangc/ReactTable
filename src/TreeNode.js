/**
 * Represents a grouping of table rows with references to children that are also grouping
 * of rows
 * @constructor
 */
function TreeNode(sectorTitle, parent) {
    // accessible properties
    this.sectorTitle = sectorTitle;
    this.parent = parent;
    this.subtotalByColumnDef = {};
    this.rowData = null;
    this.display = true;
    this.children = [];
    this.ultimateChildren = [];
    this.collapsed = this.parent != null;
    this.sortIndex = null;
    this.hiddenByFilter = false;
    // private members
    this._childrenSectorNameMap = {}
}

TreeNode.prototype.appendUltimateChild = function (row) {
    this.ultimateChildren.push(row)
}

TreeNode.prototype.collapseImmediateChildren = function () {
    for (var i = 0; i < this.children.length; i++)
        this.children[i].collapsed = true;
}

TreeNode.prototype.foldSubTree = function () {
    for (var i = 0; i < this.children.length; i++) {
        if (!this.children[i].hasChild())
            this.children[i].collapsed = true;
        else
            this.children[i].collapsed = false;
        this.children[i].foldSubTree();
    }
};

TreeNode.prototype.hasChild = function () {
    return (this.children.length > 0);
};

TreeNode.prototype.expandRecursively = function () {
    var i;
    for (i = 0; i < this.children.length; i++) {
        this.children[i].collapsed = false;
        this.children[i].expandRecursively();
    }
};

/**
 * Appends the given row into the ultimateChildren of the specified child node of the current node
 * @param childSectorName
 * @param childRow
 * @returns the child TreeNode that the data was appended to
 */
TreeNode.prototype.appendRowToChildren = function (options) {
    var childSectorName = options.childSectorName, childRow = options.childRow, sortIndex = options.sortIndex, subtotalByColumnDef = options.subtotalByColumnDef;
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new TreeNode(childSectorName, this);
        child.sortIndex = sortIndex;
        child.subtotalByColumnDef = subtotalByColumnDef;
        this.children.push(child);
        this._childrenSectorNameMap[childSectorName] = child;
    }
    if (childRow)
        this._childrenSectorNameMap[childSectorName].appendUltimateChild(childRow);
    return this._childrenSectorNameMap[childSectorName];
};

TreeNode.prototype.getSectorPath = function () {
    var result = [this.sectorTitle], prevParent = this.parent;
    while (prevParent != null) {
        result.unshift(prevParent.sectorTitle);
        prevParent = prevParent.parent;
    }
    return result;
};

/**
 * Return a composite sorter that takes multiple sort functions in an array and apply them in order.
 * @param funcs the list of functions to sort by
 * @param isSummaryRow indicate whether the sort function are to be applied to sumamry rows, whose `rowData` property needs to be compared
 *
 * @returns {Function} a function that sorts the comparable elements by using constituents of funcs until the 'tie' is broken
 */
function buildCompositeSorter(funcs, isSummaryRow) {
    return function (a, b) {
        var i = 0, sortOutcome = 0;
        while (sortOutcome == 0 && i < funcs.length) {
            if (isSummaryRow)
                sortOutcome = funcs[i](a.rowData, b.rowData);
            else
                sortOutcome = funcs[i](a, b);
            i++;
        }
        return sortOutcome;
    }
}

/**
 * Sort the child nodes of this node recursively according to the array of sort functions passed into sortFuncs
 * @param sortFuncs
 */
TreeNode.prototype.sortNodes = function (sortFuncs) {
    if (this.hasChild()) {
        this.children.sort(buildCompositeSorter(sortFuncs, true));
        $.each(this.children, function (idx, child) {
            child.sortNodes(sortFuncs);
        });
    }
    else
        this.ultimateChildren.sort(buildCompositeSorter(sortFuncs, false));
};

TreeNode.prototype.filterByColumn = function (columnDef, textToFilterBy, caseSensitive, customFilterer) {
    if (columnDef.format === "number")
        this.filterByNumericColumn(columnDef, textToFilterBy);
    else
        this.filterByTextColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
};

function filterInArray(filterArr, columnDef, row, caseSensitive) {
    var ret = null;
    if (caseSensitive) {
        ret = filterArr.some(function (filterText) {
            return buildCellLookAndFeel(columnDef, row).value.toString().search(filterText) !== -1;
        });
    } else {
        ret = filterArr.some(function (filterText) {
            return buildCellLookAndFeel(columnDef, row).value.toString().toUpperCase().search(filterText.toUpperCase()) !== -1;
        });
    }

    return !ret;
}

TreeNode.prototype.filterByTextColumn = function (columnDef, textToFilterBy, caseSensitive, customFilterer) {
    // Filter aggregations
    for (var i = 0; i < this.children.length; i++) {
        // Call recursively to filter leaf nodes first
        this.children[i].filterByColumn(columnDef, textToFilterBy, caseSensitive, customFilterer);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for (var j = 0; j < this.children[i].ultimateChildren.length; j++) {
            if (!this.children[i].ultimateChildren[j].hiddenByFilter) {
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if (!this.hasChild()) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            if (customFilterer) {
                uChild.hiddenByFilter = !customFilterer(columnDef, uChild, textToFilterBy);
            }
            else {
                var row = {};
                row[columnDef.colTag] = uChild[columnDef.colTag];
                uChild.hiddenByFilter = typeof row[columnDef.colTag] === 'undefined' || uChild.hiddenByFilter || filterInArray(textToFilterBy, columnDef, row, caseSensitive);
            }
        }
    }
};

TreeNode.prototype.filterByNumericColumn = function (columnDef, filterData) {
    // Filter aggregations
    for (var i = 0; i < this.children.length; i++) {
        // Call recursively to filter leaf nodes first
        this.children[i].filterByNumericColumn(columnDef, filterData);
        // Check to see if all children are hidden, then hide parent if so
        var allChildrenHidden = true;
        for (var j = 0; j < this.children[i].ultimateChildren.length; j++) {
            if (!this.children[i].ultimateChildren[j].hiddenByFilter) {
                allChildrenHidden = false;
                break;
            }
        }
        this.children[i].hiddenByFilter = allChildrenHidden;
    }
    if (!this.hasChild()) {
        for (var i = 0; i < this.ultimateChildren.length; i++) {
            var uChild = this.ultimateChildren[i];
            var row = {};
            row[columnDef.colTag] = uChild[columnDef.colTag];
            var filterOutNode = false;
            var multiplier = buildLAFConfigObject(columnDef).multiplier;
            var value = row[columnDef.colTag] * parseFloat(multiplier);
            for (var j = 0; j < filterData.length; j++) {
                if (filterData[j].gt !== undefined) {
                    if (!(value > filterData[j].gt))
                        filterOutNode = true;
                }
                else if (filterData[j].lt !== undefined) {
                    if (!(value < filterData[j].lt))
                        filterOutNode = true;
                }
                else if (filterData[j].eq !== undefined) {
                    if (!(value == filterData[j].eq))
                        filterOutNode = true;
                }
            }

            uChild.hiddenByFilter = filterOutNode;
        }
    }
};

TreeNode.prototype.clearFilter = function () {
    this.hiddenByFilter = false;
};

TreeNode.prototype.sortRecursivelyBySortIndex = function () {
    // test if children have sortIndex - if not skip sorting children
    if (this.hasChild() && _hasSortIndex(this.children[0])) {
        this.children.sort(function (a, b) {
            if (_hasSortIndex(a) && _hasSortIndex(b))
                return a.sortIndex - b.sortIndex;
            return 0;
        });
    }
    // sort children's children
    for (var i = 0; i < this.children.length; i++)
        this.children[i].sortRecursivelyBySortIndex();
};

/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function _hasSortIndex(node) {
    return (node != null && node.sortIndex != null && !isNaN(node.sortIndex))
}
