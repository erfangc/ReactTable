/**
 * No Pun Intended
 * @constructor
 */
function Node(sectorTitle, parent) {
    this.sectorTitle = sectorTitle;
    this.parent = parent;
    this.rowData = null;
    this.children = [];
    this.ultimateChildren = [];

    this._childrenSectorNameMap = {};
}

Node.prototype.appendRow = function (row) {
    this.ultimateChildren.push(row);
}

/**
 * Appends the given row into the ultimateChildren of the specified child node of the current node
 * @param childSectorName
 * @param childRow
 * @returns the child Node that the data was appended to
 */
Node.prototype.appendRowToChildren = function (childSectorName, childRow) {
    // create a new child node if one by the current sector name does not exist
    if (this._childrenSectorNameMap[childSectorName] == null) {
        var child = new Node(childSectorName, this);
        this.children.push(child);
        this._childrenSectorNameMap[childSectorName] = child;
    }
    this._childrenSectorNameMap[childSectorName].appendRow(childRow);
    return this._childrenSectorNameMap[childSectorName];
}

Node.prototype.getSectorPath = function () {
    var result = [this.sectorTitle], prevParent = this.parent;
    while (prevParent != null) {
        result.unshift(prevParent.sectorTitle);
        prevParent = prevParent.parent;
    }
    return result;
}

Node.prototype.sortChildren = function (sortFn) {
    "use strict";
}