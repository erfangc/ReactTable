/** @jsx React.DOM */

/**
 * The core data is represented as a multi-node tree structure, where each node on the tree represents a 'sector'
 * and can refer to children 'sectors'.
 * @author Erfang Chen
 */
var idCounter = 0;

/**
 * The main component class. Creates an table element with the corresponding sub-components
 * Please make sure to use caution when adding to props or states. Per react.js best-practices, we should avoid
 * storing states where possible, and props should be documented in 'propTypes', see below, for validation purposes.
 */
var ReactTable = React.createClass({

    getInitialState: ReactTableGetInitialState,
    propTypes: {
        /**
         * core props
         */
        data: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        columnDefs: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        subtotalBy: React.PropTypes.arrayOf(React.PropTypes.object),
        sortBy: React.PropTypes.arrayOf(React.PropTypes.object),
        selectedRows: React.PropTypes.arrayOf(React.PropTypes.string),
        rowKey: React.PropTypes.string,
        cellRightClickMenu: React.PropTypes.object,
        /**
         * callbacks that the table accept
         */
        afterColumnRemove: React.PropTypes.func,
        beforeColumnAdd: React.PropTypes.func,
        onSelectCallback: React.PropTypes.func,
        onSummarySelectCallback: React.PropTypes.func,
        onRightClick: React.PropTypes.func,
        afterFilterCallback: React.PropTypes.func,
        buildFiltersCallback: React.PropTypes.func,
        /**
         * props to selectively disable table features
         */
        disableAddColumn: React.PropTypes.bool,
        disablePagination: React.PropTypes.bool,
        disableInfiniteScrolling: React.PropTypes.bool,
        disableExporting: React.PropTypes.bool,
        disableGrandTotal: React.PropTypes.bool,
        /**
         * misc props
         */
        pageSize: React.PropTypes.number
    },
    getDefaultProps: function () {
        return {
            pageSize: 50,
            extraStyle: {
                "cursor": "pointer"
            },
            subtotalBy: [],
            sortBy: []
        };
    },
    /* --- Called by component or child react components --- */
    /**
     * Handles resetting all current sorting and replacing sort order
     * by the columnDef specified
     * @param columnDef
     */
    handleSetSort: function (columnDef, sortType, event) {
        event.stopPropagation();
        const sortBy = this.state.sortBy;
        const existing = findDefByColTag(sortBy, columnDef.colTag);
        sortType = sortType || (existing && existing.sortType === 'asc' ? 'desc' : 'asc');
        while (sortBy.length > 0)
            sortBy.pop();
        sortBy.push({colTag: columnDef.colTag, sortType: sortType});
        var newState = {
            sortBy: sortBy
        };
        this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, sortBy));
        newState.rootNode = this.state.rootNode;
        this.setState(newState);

    },
    handleAddSort: function (columnDef, sortType, event) {
        event.stopPropagation();
        const sortBy = this.state.sortBy;
        /**
         * if the current column is already part of the sort, then replace its sort type
         * otherwise add it to the list of columns that needs to be sorted
         */
        var colPosition = findPositionByColTag(sortBy, columnDef.colTag);
        if (colPosition != -1)
            sortBy[colPosition].sortType = sortType;
        else
            sortBy.push({colTag: columnDef.colTag, sortType: sortType});

        var newState = {
            sortBy: sortBy
        };
        this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, sortBy));
        newState.rootNode = this.state.rootNode;
        this.setState(newState);
    },
    /**
     * clearing sort always creates a new rootNode
     * so all sub-state information in the rootNode will be lost
     */
    clearSort: function (event) {
        event.stopPropagation();
        const newState = this.state;
        /**
         * do not set subtotalBy or sortBy to blank array - simply pop all elements off, so it won't disrupt external reference
         */
        const sortBy = this.state.sortBy;
        while (sortBy.length > 0)
            sortBy.pop();
        newState.sortBy = sortBy;
        newState.rootNode = createNewRootNode(this.props, this.state);
        this.setState(newState);
    },
    handleColumnFilter: ReactTableHandleColumnFilter,
    handleClearFilter: ReactTableHandleRemoveFilter,
    handleClearAllFilters: ReactTableHandleRemoveAllFilters,
    handleAdd: ReactTableHandleAdd,
    handleRemove: ReactTableHandleRemove,
    handleToggleHide: ReactTableHandleToggleHide,
    handleSubtotalBy: ReactTableHandleSubtotalBy,
    handleClearSubtotal: ReactTableHandleClearSubtotal,
    handlePageClick: ReactTableHandlePageClick,
    handleSelect: ReactTableHandleSelect,
    handleCollapseAll: function () {
        this.state.rootNode.foldSubTree();
        this.state.rootNode.collapseImmediateChildren();
        this.setState({
            currentPage: 1,
            lowerVisualBound: 0,
            upperVisualBound: this.props.pageSize
        });
    },
    handleExpandAll: function () {
        this.state.rootNode.expandRecursively();
        this.setState({
            currentPage: 1,
            lowerVisualBound: 0,
            upperVisualBound: this.props.pageSize
        });
    },
    handleDownload: function (type) {
        var reactTableData = this;

        var objToExport = {headers: [], data: []};

        var firstColumn = this.state.columnDefs[0];

        var rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: firstColumn,
            selectedDetailRows: this.state.selectedDetailRows
        });

        var firstColumnLabel = buildFirstColumnLabel(this);
        $.each(this.props.columnDefs, function () {
            if (this.colTag === 'subtotalBy') {
                objToExport.headers.push(firstColumnLabel);
            } else {
                objToExport.headers.push(this.text);
            }
        });

        $.each(rasterizedData, function () {
            if (this[firstColumn.colTag] === "Grand Total")
                return;
            var row = [];
            var datum = this;
            $.each(reactTableData.props.columnDefs, function () {
                row.push(buildCellLookAndFeel(this, datum).value);
            });
            objToExport.data.push(row);
        });

        if (type === "excel")
            exportToExcel(objToExport, this.props.filenameToSaveAs ? this.props.filenameToSaveAs : "table-export", this);
        else if (type === "pdf")
            exportToPDF(objToExport, this.props.filenameToSaveAs ? this.props.filenameToSaveAs : "table-export", this);
    },
    /* -------------------------------------------------- */
    toggleSelectDetailRow: function (key) {
        var selectedDetailRows = this.state.selectedDetailRows, state;
        if (selectedDetailRows[key] != null) {
            delete selectedDetailRows[key];
            state = false;
        }
        else {
            selectedDetailRows[key] = 1;
            state = true;
        }
        this.setState({
            selectedDetailRows: selectedDetailRows
        });
        return state;
    },
    toggleSelectSummaryRow: function (key) {
        var selectedSummaryRows = this.state.selectedSummaryRows, state;
        if (selectedSummaryRows[key] != null) {
            delete selectedSummaryRows[key];
            state = false;
        } else {
            selectedSummaryRows[key] = 1;
            state = true;
        }
        this.setState({
            selectedSummaryRows: selectedSummaryRows
        });
        return state;
    },
    forceSort: function () {
        this.state.rootNode.sortNodes(convertSortByToFuncs(this.state.columnDefs, this.state.sortBy));
        this.setState({});
    },
    getDetailToggleState: function (key) {
        return this.state.selectedDetailRows[key] && true;
    },
    clearAllRowSelections: function () {
        this.setState({
            selectedDetailRows: {},
            selectedSummaryRows: {}
        });
    },
    getRowSelectionStates: function () {
        return {
            selectedDetailRows: this.state.selectedDetailRows,
            selectedSummaryRows: this.state.selectedSummaryRows
        };
    },
    /* --- Called from outside the component --- */
    /**
     * Add a new column to the table. This assumes the data props has been updated to reflect the values referred to by
     * the new column you are about to add.
     *
     * @param columnDef the column definition to add
     * @param idx the position in the columnDefs state to add it to, if not specified, will just append
     */
    addColumn: function (columnDef, idx) {
        var columnDefs = this.state.columnDefs;
        // do nothing if columnDef already exist
        if (!columnDef.colTag || findPositionByColTag(columnDefs, columnDef.colTag) != -1)
            return;
        if (idx)
            columnDefs.splice(idx + 1, 0, columnDef);
        else
            columnDefs.push(columnDef);
        /**
         * we will want to perform an aggregation
         */
        recursivelyAggregateNodes(this.state.rootNode, this.state);
        this.setState({
            columnDefs: columnDefs
        });
    },
    handleScroll: function (e) {
        const $target = $(e.target);
        const scrollTop = $target.scrollTop();
        const height = $target.height();
        const totalHeight = $target.find("tbody").height();
        const avgRowHeight = totalHeight / $target.find("tbody > tr").length;
        /**
         * always update lastScrollTop on scroll event - it helps us determine
         * whether the next scroll event is up or down
         */
        var newState = {lastScrollTop: scrollTop};
        /**
         * we determine the correct display boundaries by keeping the distance between lower and upper visual bound
         * to some constant multiple of pageSize
         */
        const rowDisplayBoundry = 2 * this.props.pageSize;
        if (scrollTop < this.state.lastScrollTop && scrollTop <= 0) {
            // up scroll limit triggered
            newState.lowerVisualBound = Math.max(this.state.lowerVisualBound - this.props.pageSize, 0);
            newState.upperVisualBound = newState.lowerVisualBound + rowDisplayBoundry;
            /**
             * if top most rows reached, do nothing, otherwise reset scrollTop to preserve current view
             */
            if (!(newState.lowerVisualBound === 0))
                setTimeout(function () {
                    $target.scrollTop(Math.max(scrollTop + this.props.pageSize * avgRowHeight, 0));
                }.bind(this));

        } else if (scrollTop > this.state.lastScrollTop && (scrollTop + height) >= totalHeight) {
            // down scroll limit triggered
            /**
             * we either increment upperVisualBound by a single page (specified via props.pageSize) or the max rows that can be displayed
             * we know the end has been reached if upperVisualBound + pageSize > maxRows
             */
            newState.upperVisualBound = this.state.upperVisualBound + this.props.pageSize > this.state.maxRows ? this.state.maxRows : this.state.upperVisualBound + this.props.pageSize;
            newState.lowerVisualBound = Math.max(newState.upperVisualBound - rowDisplayBoundry, 0);
            /**
             * if previous upperVisualBound is the default (props.pageSize), it could actually be greater than the current
             */
            const additionalRows = Math.max(newState.upperVisualBound - this.state.upperVisualBound, 0);
            if (additionalRows > 0)
                setTimeout(function () {
                    var newScrollTop = scrollTop - (additionalRows * avgRowHeight);
                    if (newScrollTop > 0)
                        $target.scrollTop(newScrollTop);
                }.bind(this));
        }
        this.setState(newState);
    },
    /* ----------------------------------------- */

    componentDidMount: function () {
        if (!this.props.disableInfiniteScrolling)
            $(this.getDOMNode()).find(".rt-scrollable").get(0).addEventListener('scroll', this.handleScroll);
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this), 0);
        setTimeout(function () {
            adjustHeaders.call(this);
        }.bind(this), 500);

        document.addEventListener('click', docClick.bind(this));
        window.addEventListener('resize', adjustHeaders.bind(this));
        var $node = $(this.getDOMNode());
        $node.find(".rt-scrollable").bind('scroll', function () {
            $node.find(".rt-headers").css({'overflow': 'auto'}).scrollLeft($(this).scrollLeft());
            $node.find(".rt-headers").css({'overflow': 'hidden'});
        });
        bindHeadersToMenu($node);

        // build dropdown list for column filter
        buildFilterData.call(this, false);
    },
    componentWillMount: function () {
    },
    componentWillUnmount: function () {
        window.removeEventListener('resize', adjustHeaders.bind(this));
        if (this.props.disableInfiniteScrolling)
            $(this.getDOMNode()).find(".rt-scrollable").get(0).removeEventListener('scroll', this.handleScroll);
    },
    componentDidUpdate: function () {
        adjustHeaders.call(this);
        bindHeadersToMenu($(this.getDOMNode()));
    },
    addFilter: function (columnDefToFilterBy, filterData) {
        this.handleColumnFilter.call(this, columnDefToFilterBy, filterData);
    },
    removeFilter: function ReactTableHandleRemoveFilter(colDef, dontSet) {
        this.handleClearFilter.call(this, colDef, dontSet);
    },
    removeAllFilter: function () {
        this.handleClearAllFilters.call(this);
    },
    exportDataWithSubtotaling: function () {
        return rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        }, this.state.subtotalBy.length > 0, true);
    },
    exportDataWithoutSubtotaling: function () {
        return rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        }, this.state.subtotalBy.length > 0, true,true);
    },
    render: function () {
        addExtraColumnForSubtotalBy.call(this);

        const rasterizedData = rasterizeTree({
            node: this.state.rootNode,
            firstColumn: this.state.columnDefs[0],
            selectedDetailRows: this.state.selectedDetailRows
        }, this.state.subtotalBy.length > 0);
        // maxRows is referenced later during event handling to determine upperVisualBound
        this.state.maxRows = rasterizedData.length;

        // TODO merge lower&upper visual bound into state, refactor getPaginationAttr
        var paginationAttr = getPaginationAttr(this, rasterizedData);

        //var grandTotal = buildGrandTotal.call(this, rasterizedData.splice(0, 1));
        var grandTotal = rasterizedData.splice(0, 1).map(rowMapper, this);

        var rowsToDisplay = [];
        if (this.props.disableInfiniteScrolling)
            rowsToDisplay = rasterizedData.slice(paginationAttr.lowerVisualBound, paginationAttr.upperVisualBound + 1).map(rowMapper, this);
        else
            rowsToDisplay = rasterizedData.slice(this.state.lowerVisualBound, this.state.upperVisualBound + 1).map(rowMapper, this);

        var headers = buildHeaders(this);

        var tableBodyContainerStyle = {};
        if (this.props.height && parseInt(this.props.height) > 0) {
            tableBodyContainerStyle.height = this.props.height;
        }

        if (this.props.disableScrolling)
            tableBodyContainerStyle.overflowY = "hidden";

        return (
            <div id={this.state.uniqueId} className="rt-table-container">
                {headers}
                <div style={tableBodyContainerStyle} className="rt-scrollable">
                    <table className="rt-table"  >
                        <tbody>
                            {rowsToDisplay}
                        </tbody>
                    </table>
                </div>
                {grandTotal}
                {buildFooter.call(this, paginationAttr, rasterizedData.length)}
            </div>
        );
    }
});

/**
 * Represents a row in the table, built from cells
 */
var Row = React.createClass({
    render: function () {
        const cx = React.addons.classSet;
        var cells = [];
        var isGrandTotal = false;
        if (!this.props.data.isDetail && this.props.data.sectorPath.length == 1 && this.props.data.sectorPath[0] == 'Grand Total') {
            isGrandTotal = true;
        }

        for (var i = 0; i < this.props.columnDefs.length; i++) {
            if (i === 0 && !this.props.data.isDetail) {
                cells.push(buildFirstCellForSubtotalRow.call(this, isGrandTotal));
            } else {
                var columnDef = this.props.columnDefs[i];
                var displayInstructions = buildCellLookAndFeel(columnDef, this.props.data);
                var classes = cx(displayInstructions.classes);
                // easter egg - if isLoading is set to true on columnDef - spinners will show up instead of blanks or content
                var displayContent = columnDef.isLoading ? "Loading ... " : displayInstructions.value;

                // convert and format dates
                if (columnDef && columnDef.format && columnDef.format.toLowerCase() === "date") {
                    if (typeof displayContent === "number") // if displayContent is a number, we assume displayContent is in milliseconds
                        displayContent = new Date(displayContent).toLocaleDateString();
                }
                // determine cell content, based on whether a cell templating callback was provided
                if (columnDef.cellTemplate)
                    displayContent = columnDef.cellTemplate.call(this, this.props.data, columnDef, displayContent);
                if (isGrandTotal) {
                    var grandTotalCellStyle = {textAlign: displayInstructions.styles.textAlign};
                    if (displayContent) {
                        grandTotalCellStyle.width = displayContent.length + "em";
                    }
                    cells.push(
                        <div className={classes + " rt-grand-total-cell"} >
                            <div className="rt-grand-total-cell-content" style={grandTotalCellStyle}>
                                    {displayContent ? displayContent : <span>&nbsp;</span>}
                            </div>
                        </div>
                    );
                }
                else {
                    cells.push(
                        <td
                            className={classes}
                            ref={columnDef.colTag}
                            onClick={columnDef.onCellSelect ? columnDef.onCellSelect.bind(null, this.props.data[columnDef.colTag], columnDef, i) : null}
                            onContextMenu={this.props.cellRightClickMenu ? openCellMenu.bind(this, columnDef) : this.props.onRightClick ? this.props.onRightClick.bind(null, this.props.data, columnDef) : null}
                            style={displayInstructions.styles}
                            key={columnDef.colTag}
                            //if define doubleClickCallback, invoke this first, otherwise check doubleClickFilter
                            onDoubleClick={columnDef.onDoubleClick ? columnDef.onDoubleClick.bind(null, this.props.data[columnDef.colTag], columnDef, i) : this.props.filtering && this.props.filtering.doubleClickCell ?
                                this.props.handleColumnFilter(null, columnDef) : null }>
                    {displayContent}
                    {this.props.cellRightClickMenu && this.props.data.isDetail ? buildCellMenu(this.props.cellRightClickMenu, this.props.data, columnDef, this.props.columnDefs) : null}
                        </td>
                    );
                }
            }
        }

        classes = cx({
            //TODO: to hightlight a selected row, need press ctrl
            //'selected': this.props.isSelected && this.props.data.isDetail,
            'summary-selected': this.props.isSelected && !this.props.data.isDetail,
            'group-background': !this.props.data.isDetail
        });

        if (isGrandTotal) {
            return (<div className="rt-grand-total">
                        {cells}
            </div>)
        } else
        // apply extra CSS if specified
            return (<tr onClick={this.props.onSelect.bind(null, this.props.data)}
                className={classes} style={this.props.extraStyle}>{cells}</tr>);
    }
});

var PageNavigator = React.createClass({
    handleClick: function (index, event) {
        event.preventDefault();
        if (index <= this.props.numPages && index >= 1)
            this.props.handleClick(index);
    },
    render: function () {
        var self = this;
        var cx = React.addons.classSet;
        var prevClass = cx({
            disabled: (this.props.activeItem == 1)
        });
        var nextClass = cx({
            disabled: (this.props.activeItem == this.props.numPages)
        });

        var items = this.props.items.map(function (item) {
            return (
                <li key={item} className={self.props.activeItem == item ? 'active' : ''}>
                    <a onClick={self.handleClick.bind(null, item)}>{item}</a>
                </li>
            )
        });

        return (
            <ul className={prevClass} className="pagination pull-right">
                <li className={nextClass}>
                    <a className={prevClass}
                        onClick={this.props.handleClick.bind(null, this.props.activeItem - 1)}>&laquo;</a>
                </li>
                {items}
                <li className={nextClass}>
                    <a className={nextClass}
                        onClick={this.props.handleClick.bind(null, this.props.activeItem + 1)}>&raquo;</a>
                </li>
            </ul>
        );
    }
});

var SubtotalControl = React.createClass({
    getInitialState: function () {
        return {
            userInputBuckets: ""
        }
    },
    handleChange: function (event) {
        this.setState({userInputBuckets: event.target.value});
    },
    handleKeyPress: function (event) {
        if (event.charCode == 13) {
            event.preventDefault();
            this.props.table.handleSubtotalBy(this.props.columnDef, this.state.userInputBuckets);
        }
    },
    handleClick: function (event) {
        event.stopPropagation();
        var $node = $(this.getDOMNode());
        $node.children(".menu-item-input").children("input").focus();
    },
    render: function () {
        var table = this.props.table, columnDef = this.props.columnDef;
        var subMenuAttachment = columnDef.format == "number" || columnDef.format == "currency" ?
            (
                <div className="menu-item-input" style={{"position": "absolute", "top": "-50%", "right": "100%"}}>
                    <label style={{"display": "block"}}>Enter Bucket(s)</label>
                    <input tabIndex="1" onKeyPress={this.handleKeyPress} onChange={this.handleChange}
                        placeholder="ex: 1,10,15"/>
                    <a tabIndex="2" style={{"display": "block"}}
                        onClick={table.handleSubtotalBy.bind(null, columnDef, this.state.userInputBuckets)}
                        className="btn-link">Ok</a>
                </div>
            ) : null;
        return (
            <div
                onClick={subMenuAttachment == null ? table.handleSubtotalBy.bind(null, columnDef, null) : this.handleClick}
                style={{"position": "relative"}} className="menu-item menu-item-hoverable">
                <div>
                    <span>
                        <i className="fa fa-plus"></i>
                    &nbsp;Add Subtotal</span>
                </div>
                {subMenuAttachment}
            </div>
        );
    }
});

/*
 * ----------------------------------------------------------------------
 * Public Helpers / Utilities
 * ----------------------------------------------------------------------
 */

function generateSectorKey(sectorPath) {
    if (sectorPath == null)
        return "";
    return sectorPath.join("#");
}

function generateRowKey(row, rowKey) {
    var key;
    if (!row.isDetail) {
        key = generateSectorKey(row.sectorPath);
    }
    else if (rowKey)
        key = row[rowKey];
    else {
        key = row.rowCount;
    }
    return key;
}

function rowMapper(row) {
    var rowKey = this.props.rowKey;
    var generatedKey = generateRowKey(row, rowKey);
    return (<Row
        key={generatedKey}
        data={row}
        extraStyle={resolveExtraStyles(generatedKey, this.props.extraStyle)}
        isSelected={isRowSelected(row, this.props.rowKey, this.state.selectedDetailRows, this.state.selectedSummaryRows)}
        onSelect={this.handleSelect}
        onRightClick={this.props.onRightClick}
        toggleHide={this.handleToggleHide}
        columnDefs={this.state.columnDefs}
        filtering={this.props.filtering}
        handleColumnFilter={this.handleColumnFilter.bind}
        cellRightClickMenu={this.props.cellRightClickMenu}
    />);
}

function docClick(e) {
    //adjustHeaders.call(this);
    // Remove filter-in-place boxes if they are open and they weren't clicked on
    if (!jQuery.isEmptyObject(this.state.filterInPlace)) {
        if (!($(e.target).hasClass("rt-headers-container") || $(e.target).parents(".rt-headers-container").length > 0)) {
            this.setState({
                filterInPlace: {}
            });
        }
    }
}

function adjustHeaders(adjustCount) {
    if(this.state.maxRows == 1){
        //if table has no data, don't change column width
        return;
    }

    var id = this.state.uniqueId;
    if (!(adjustCount >= 0))
        adjustCount = 0;
    var counter = 0;
    var headerElems = $("#" + id + " .rt-headers-container");
    var headerContainerWidth = $("#" + id + ' .rt-headers-grand-container').width();
    var padding = parseInt(headerElems.first().find(".rt-header-element").css("padding-left"));
    padding += parseInt(headerElems.first().find(".rt-header-element").css("padding-right"));

    var grandTotalFooter = $('#' + id + ' .rt-grand-total');
    grandTotalFooter.width(headerContainerWidth);
    var grandTotalFooterCells = grandTotalFooter.find('.rt-grand-total-cell');
    var grandTotalFooterCellContents = grandTotalFooter.find('.rt-grand-total-cell-content');
    var adjustedSomething = false;

    var table = this;
    headerElems.each(function () {
        var currentHeader = $(this);
        if (counter == headerElems.length - 1 && !table.props.disableAddColumn) {
            // give a space for plus column sign
            var lastColumnWidth = $('#' + id + ' .rt-table tr:first td:eq(' + counter + ')').outerWidth() - 1;
            if (counter == 0 && parseInt(headerElems.first().css("border-right")) == 1) {
                lastColumnWidth += 1;
            }
            $(grandTotalFooterCells[counter]).css("width", (lastColumnWidth + 2) + "px");
            lastColumnWidth -= 21; // minus plus sign width
            currentHeader.css("width", lastColumnWidth + "px");
        } else {
            var headerTextWidthWithPadding = currentHeader.find(".rt-header-anchor-text").width() + padding;
            var footerCellContentWidth = $(grandTotalFooterCellContents[counter]).width() + 10; // 10 is padding
            headerTextWidthWithPadding = footerCellContentWidth > headerTextWidthWithPadding ? footerCellContentWidth : headerTextWidthWithPadding;

            if (currentHeader.width() > 0 && headerTextWidthWithPadding > currentHeader.width() + 1) {
                currentHeader.css("width", headerTextWidthWithPadding + "px");
                $("#" + id).find("tr").find("td:eq(" + counter + ")").css("min-width", (headerTextWidthWithPadding) + "px");
                if (counter != (grandTotalFooterCells.length - 1)) {
                    $(grandTotalFooterCells[counter]).css("width", (headerTextWidthWithPadding) + "px");
                }
                adjustedSomething = true;
            }

            var width = $('#' + id + ' .rt-table tr:first td:eq(' + counter + ')').outerWidth() - 1;
            if (counter == 0 && parseInt(headerElems.first().css("border-right")) == 1) {
                width += 1;
            }
            if (width !== currentHeader.width()) {
                currentHeader.width(width);
                $(grandTotalFooterCells[counter]).width(width);
                adjustedSomething = true;
            }
            counter++;
        }
    });

    if (!adjustedSomething)
        return;

    // Realign sorting carets
    var downs = headerElems.find(".rt-downward-caret").removeClass("rt-downward-caret");
    var ups = headerElems.find(".rt-upward-caret").removeClass("rt-upward-caret");
    setTimeout(function () {
        downs.addClass("rt-downward-caret");
        ups.addClass("rt-upward-caret");
    }, 0);

    if (adjustCount <= 5)
        adjustHeaders.call(this, ++adjustCount);
}

function bindHeadersToMenu(node) {
    node.find(".rt-headers-container").each(function () {
        var headerContainer = this;
        $(headerContainer).hover(function () {
            var headerPosition = $(headerContainer).position();
            if (headerPosition.left) {
                $(headerContainer).find(".rt-header-menu").css("left", headerPosition.left + "px");
            }
            if (headerPosition.right) {
                $(headerContainer).find(".rt-header-menu").css("right", headerPosition.right + "px");
            }
        });
    });
}

function uniqueId(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
}
/*
 * ----------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------------
 */

function isRowSelected(row, rowKey, selectedDetailRows, selectedSummaryRows) {
    if (rowKey == null)
        return;
    return selectedDetailRows[row[rowKey]] != null || (!row.isDetail && selectedSummaryRows[generateSectorKey(row.sectorPath)] != null);
}

function resolveExtraStyles(generatedKey, extraStyles) {
    return generatedKey && extraStyles ? extraStyles[generatedKey] : null;
}

function getPaginationAttr(table, data) {
    var result = {};

    if (table.props.disablePagination) {
        result.lowerVisualBound = 0;
        result.upperVisualBound = data.length
    } else {
        result.pageSize = (table.props.pageSize || 50);
        result.maxDisplayedPages = table.props.maxDisplayedPages || 10;

        result.pageStart = 1;
        result.pageEnd = Math.ceil(data.length / result.pageSize);

        result.allPages = [];
        for (var i = result.pageStart; i <= result.pageEnd; i++) {
            result.allPages.push(i);
        }
        // derive the correct page navigator selectable pages from current / total pages
        result.pageDisplayRange = computePageDisplayRange(table.state.currentPage, result.maxDisplayedPages);

        result.lowerVisualBound = (table.state.currentPage - 1) * result.pageSize;
        result.upperVisualBound = Math.min(table.state.currentPage * result.pageSize - 1, data.length);

        if (result.lowerVisualBound > result.upperVisualBound) {
            // after filter, data length has reduced. if lowerVisualBound is larger than the upperVisualBound, go to first page
            table.state.currentPage = 1;
            result.lowerVisualBound = 0;
            result.upperVisualBound = Math.min(result.pageSize - 1, data.length);
        }
    }

    return result;

}

function computePageDisplayRange(currentPage, maxDisplayedPages) {
    // total number to allocate
    var displayUnitsLeft = maxDisplayedPages;
    // allocate to the left
    var leftAllocation = Math.min(Math.floor(displayUnitsLeft / 2), currentPage - 1);
    var rightAllocation = displayUnitsLeft - leftAllocation;
    return {
        start: currentPage - leftAllocation - 1,
        end: currentPage + rightAllocation - 1
    }
}

function buildFilterData(isUpdate) {
    setTimeout(function () {
        if (isUpdate) {
            this.state.filterDataCount = {};
            this.state.filterData = {};
        }
        for (var i = 0; i < this.props.data.length; i++) {
            buildFilterDataHelper(this.props.data[i], this.state, this.props);
        }
        convertFilterData(this.state.filterDataCount, this.state);
        if (isUpdate) {
            this.props.buildFiltersCallback && this.props.buildFiltersCallback(this.state.filterDataCount);
        }
    }.bind(this));
}

/**
 * generate distinct values for each column
 * @param row
 * @param state
 * @param props
 */
function buildFilterDataHelper(row, state, props) {
    if (row.hiddenByFilter == true) {
        return;
    }

    if (!state.filterDataCount) {
        state.filterDataCount = {};
    }

    var columnDefs = state.columnDefs;
    for (var i = 0; i < columnDefs.length; i++) {
        if (columnDefs[i].format == 'number' || columnDefs[i].colTag == props.rowKey) {
            continue;
        }

        var key = columnDefs[i].colTag;
        if (row[key]) {
            var hashmap = state.filterDataCount[key] || {};
            hashmap[row[key]] = typeof hashmap[row[key]] === 'undefined' ? 1 : hashmap[row[key]] + 1;
            state.filterDataCount[key] = hashmap;
        }
    }
}

/**
 * convert distinct values in map into an array
 * @param filterData
 */
function convertFilterData(filterDataCount, state) {
    state.filterData = {};
    for (var key in filterDataCount) {
        var map = filterDataCount[key];
        var arr = [];
        for (var value in map) {
            if (value != "") {
                arr.push(value);
            }
        }
        state.filterData[key] = arr;
    }
}

function openCellMenu(columnDef, event) {
    event.preventDefault();
    var $cell = $(this.refs[columnDef.colTag].getDOMNode());
    var cellPosition = $cell.position();
    var $menu = $cell.find('.rt-cell-menu');
    if (cellPosition.left !== 0) {
        $menu.css("left", cellPosition.left + "px");
    }
    if (cellPosition.right !== 0) {
        $menu.css("right", cellPosition.right + "px");
    }
    $menu.css('display', 'block');

    $cell.hover(null, function hoveroutCell() {
        $menu.css('display', 'none');
    });

    $menu.hover(null, function hoveroutMenu() {
        $menu.css('display', 'none');
    });
}

function buildCellMenu(cellMenu, rowData, currentColumnDef, columnDefs) {
    if (!rowData[currentColumnDef.colTag]) {
        return null;
    }

    var menuItems = [];
    var menuStyle = {};

    if (cellMenu.style && cellMenu.style.textAlign === 'right') {
        menuStyle.right = "0%";
    }
    else {
        menuStyle.left = "0%";
    }

    cellMenu.menus.forEach(function (menu) {
        menuItems.push(<div className="menu-item" onClick={menu.callback.bind(null, rowData, currentColumnDef, columnDefs)} >{menu.description}</div>);
        if (menu.followingSeparator) {
            menuItems.push(<div className="separator"/>);
        }
    });

    return (
        <div style={menuStyle} className="rt-cell-menu">
            {menuItems}
        </div>
    )
}