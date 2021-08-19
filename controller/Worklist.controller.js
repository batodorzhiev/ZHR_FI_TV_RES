/*global location history */
sap.ui.define([
	"ZHR_FI_TV_RES/ZHR_FI_TV_RES/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"ZHR_FI_TV_RES/ZHR_FI_TV_RES/model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/core/Fragment'
], function(BaseController, JSONModel, History, formatter, Filter, FilterOperator, Fragment) {
	"use strict";

	return BaseController.extend("ZHR_FI_TV_RES.ZHR_FI_TV_RES.controller.Worklist", {

		formatter: formatter,

		onInit: function() {
			var oViewModel,
				iOriginalBusyDelay;
			this.table = this.byId("table");
			iOriginalBusyDelay = this.table.getBusyIndicatorDelay();
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle: this.getResourceBundle().getText("worklistTableTitle"),
				saveAsTileTitle: this.getResourceBundle().getText("saveAsTileTitle", this.getResourceBundle().getText("worklistViewTitle")),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText: this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay: 0
			});
			this.setModel(oViewModel, "worklistView");

			this.table.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
			this.addHistoryEntry({
				title: this.getResourceBundle().getText("worklistViewTitle"),
				icon: "sap-icon://table-view",
				intent: "#ZHR_FI_TV_RES-display" //Командировкидлярабочих
			}, true);

			this.getRouter().getRoute("worklist").attachPatternMatched(this._onWorklist, this);

			var model = this.getOwnerComponent().getModel();
			model.metadataLoaded().then(function() {
				var path = model.createKey("/RequestSet", {
					Reinr: "",
					Pernr: ""
				});
				model.read(path, {
					success: function(data) {
						oViewModel.setProperty("/supportFlag", data.SupportFlag);
					}
				});
			});
		},

		_onWorklist: function(oEvent) {
			this.getModel().metadataLoaded().then(function() {
				this.getModel().setSizeLimit(1000);
				this.table.getBinding("items").refresh();
			}.bind(this));
		},

		onUpdateFinished: function(oEvent) {
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		onTake: function(oEvent) {
			if (oEvent.getSource().getMetadata().getName() === "sap.m.ColumnListItem") {
				this._showObject(oEvent.getSource());
			} else if (oEvent.getSource().getMetadata().getName() === "sap.m.Button") {
				if (oEvent.getSource().getParent().getBindingContext().getProperty("ReservUname") === "") {
					this.changeBookingStatus(oEvent);
					this._showObject(oEvent.getSource());
				}
			}
		},

		onRefresh: function() {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},

		_showObject: function(oItem) {
			var data = oItem.getBindingContext().getObject();
			this.getRouter().navTo("object", {
				Reinr: data.Reinr,
				Pernr: data.Pernr
			});
		},

		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		},

		onCreateRequest: function(e) {
			if (e.getSource().data("nav")) {
				this.getRouter().navTo("create");
			} else {
				this.openDialog(e);
			}
		},

		showCities: function(oEvent) {
			var oCtx = oEvent.getSource().getBindingContext(),
				oControl = oEvent.getSource();

			// create popover
			if (!this.citiesPopup) {
				this.citiesPopup = sap.ui.xmlfragment("fragment.dialog.cities", this);
				this.getView().addDependent(this.citiesPopup);
				this.citiesPopup.attachAfterOpen(function() {
					this.disablePointerEvents();
				}, this);
				this.citiesPopup.attachAfterClose(function() {
					this.enablePointerEvents();
				}, this);
				this.citiesPopup.bindElement(oCtx.getPath());
				this.citiesPopup.openBy(oControl);
			} else {
				this.citiesPopup.bindElement(oCtx.getPath());
				this.citiesPopup.openBy(oControl);
			}
		},

		_selectionChange: function(oEvent) {
			if (oEvent.getSource().getSelectedItems().length > 0) {
				this.getView().byId("Reserve").setEnabled(true);
			} else {
				this.getView().byId("Reserve").setEnabled(false);
			}
		},

		onReserve: function() {
			this.openDialog("checkBooking");
		},

		sendDialog: function(e) {
			// var pernr, reinr, type;
			// for (var i = 0; i < this.getView().byId("table").getSelectedItems().length; i++) {
			// 	pernr = this.getView().byId("table").getSelectedItems()[i].getBindingContext().getProperty("Pernr");
			// 	reinr = this.getView().byId("table").getSelectedItems()[i].getBindingContext().getProperty("Reinr");
			// 	type = e.getSource().getParent().getContent()[0].getSelectedButton().getId();
			// 	window.open("/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/LoadBookingSet(Pernr='" + pernr + "',Reinr='" + reinr +
			// 		"',Type='" + type + "')/$value");
			// }
			var type = e.getSource().getParent().getContent()[0].getSelectedButton().getId(),
				selectedItems = this.table.getSelectedItems();
			selectedItems.forEach(function(i) {
				var itemData = i.getBindingContext().getObject();
				window.open("/sap/opu/odata/sap/ZHR_FI_TV_REQ_SRV/LoadBookingSet(Pernr='" + itemData.Pernr + "',Reinr='" + itemData.Reinr +
					"',Type='" + type + "')/$value");
			});
		},

		cancelDialog: function(oEvent) {
			oEvent.getSource().getParent().destroy();
		},

		onPress: function(oEvent) {
			this._showObject(oEvent.getSource());
		},

		disablePointerEvents: function() {
			this.byId("table").getDomRef().style["pointer-events"] = "none";
		},

		enablePointerEvents: function() {
			this.byId("table").getDomRef().style["pointer-events"] = "auto";
		},

		handleActionPress: function() {
			this.citiesPopup.close();
		},

		onSearch: function(e) {
			var items = e.getSource().getParent().getParent().getItems(),
				inputs = this.getItems(items),
				data = this.getData(inputs),
				binding = this.table.getBinding("items"),
				filters = [];
			inputs.forEach(function(input) {
				var name = input.getName();
				if (name) {
					var isDates = name.indexOf("~") > -1,
						value = isDates ? data[name.split("~")[0]] : data[name],
						value2 = isDates ? data[name.split("~")[1]] : "";
					name = isDates ? name.split("~")[0] : name;
					if (value) {
						var operator = input.data("op") ? input.data("op") : "Contains",
							filter = new Filter(name, operator, value, value2);
						filters.push(filter);
					}
				}
			});
			binding.filter(filters);

			// wtf is this?!

			// var filter;
			// var aFilters = [];
			// var value1, value2, operator;
			// var skip;
			// for (var i = 0; i < oEvent.getSource().getParent().getParent().getItems().length - 1; i++) {
			// 	var ctrl = oEvent.getSource().getParent().getParent().getItems()[i].getItems()[1];
			// 	switch (ctrl.getMetadata().getName()) {
			// 		case "sap.m.ComboBox":
			// 			value1 = ctrl.getSelectedKey();
			// 			value2 = "";
			// 			operator = FilterOperator.EQ;
			// 			skip = value1 ? false : true;
			// 			break;
			// 		case "sap.m.DateRangeSelection":
			// 			value1 = ctrl.getDateValue();
			// 			value2 = ctrl.getSecondDateValue();
			// 			operator = FilterOperator.BT;
			// 			skip = !value1 && !value2;

			// 			break;
			// 		case "sap.m.Input":
			// 			value1 = "'" + ctrl.getValue() + "'";
			// 			value2 = "";
			// 			operator = ctrl.data().op;			//	 FilterOperator.EQ;		//       		//EQ;
			// 			skip = ctrl.getValue() ? false : true;
			// 			break;
			// 			// case "sap.m.DateRangeSelection":
			// 			// 	var startDate = ctrl.dateValue;
			// 			// 	var endDate = ctrl.secondDateValue;

			// 		default:
			// 			skip = true;
			// 			break;
			// 	}
			// 	filter = new Filter({
			// 		path: ctrl.getName(),
			// 		operator: operator,
			// 		value1: value1,
			// 		value2: value2
			// 	});
			// 	if (!skip) {
			// 		aFilters.push(filter);
			// 	}
			// }

			// var oTable = this.byId("table");
			// if (aFilters.length === 0) {
			// 	oTable.getBinding("items").sFilterParams = "$filter=AppID%20eq%20%27ZHR_FI_TV_RES%27";
			// 	oTable.getBinding("items").refresh();
			// 	return;
			// }
			// filter = new Filter({
			// 	filters: aFilters,
			// 	and: true
			// });
			// oTable.getBinding("items").filter(filter);
		}
	});
});