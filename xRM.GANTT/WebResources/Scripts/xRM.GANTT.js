/// <reference path="SDK.REST.js" />
/// <reference path="../../scripts/typings/xrm/xrm.d.ts" />
/// <reference path="../../scripts/dhtmlxgantt.js" />

if (typeof (xRM) == "undefined")
{ xRM = { __namespace: true }; }

xRM.GANTT = (function () {

    var FORM_TYPES = {
        UNDEFINED: 0,
        CREATE: 1,
        UPDATE: 2,
        READ_ONLY: 3,
        DISABLED: 4,
        QUICK_CREATE: 5,
        BULK_EDIT: 6,
        READ_OPTMIZED: 11
    };

    var TASK_TYPE_GANTT_CODE = {
        TASK: 163650000,
        PROJECT: 163650001,
        MILESTONE: 163650002
    };

    var TYPE_CODE = {
        FINISH_TO_START: 163650000,
        START_TO_START: 163650001,
        FINISH_TO_FINISH: 163650002,
        START_TO_FINISH: 163650003
    };

    var ZOOM_LEVELS = {
        HOUR: 10,
        DAY: 20,
        WEEK: 30,
        MONTH: 40,
        YEAR: 1000
    };

    var zoomLevel = ZOOM_LEVELS.DAY;

    var isEmpty = function (value) {
        return (value == null || value.length === 0);
    };

    var durationTemplate = function (obj) {

        var duration = obj.duration;

        switch (zoomLevel) {

            case ZOOM_LEVELS.HOUR:
                {
                    return duration * 24;
                }
            case ZOOM_LEVELS.DAY:
                {
                    return duration;
                }
            case ZOOM_LEVELS.WEEK:
                {
                    var daysPerWeek = 7;
                    if (duration % daysPerWeek === 0) {
                        return duration / daysPerWeek;
                    }
                    return parseFloat(duration / daysPerWeek).toFixed(1);
                }
            case ZOOM_LEVELS.MONTH:
                {
                    var daysPerMonth = 30;
                    if (duration % daysPerMonth === 0) {
                        return duration / daysPerMonth;
                    }
                    return parseFloat(duration / daysPerMonth).toFixed(1);
                }

            case ZOOM_LEVELS.YEAR:
                {
                    return parseFloat(duration / 365).toFixed(2);
                }
        }

        return duration;
    };

    var openLookup = function (objecttypecode, callback) {
        //var serverUrl = window.parent.Xrm.Page.context.getServerUrl();
        var serverUrl = "https://xps.dev.xrmlive.com";
        var dialogOptions = new window.parent.Xrm.DialogOptions();
        dialogOptions.width = 800;
        dialogOptions.height = 600;
        var url = serverUrl + "/_controls/lookup/lookupsingle.aspx?class=null&objecttypes=" + objecttypecode + "&browse=0&ShowNewButton=0&ShowPropButton=1&DefaultType=0";
        window.parent.Xrm.Internal.openDialog(url, dialogOptions, null, null, callback);
    };

    var lookupFunction = function (elem) {
        openLookup(8, function (e) {

            if (isEmpty(e.items) || isEmpty(e.items[0].id)) {
                return;
            }
            var id = e.items[0].id.replace("{", "").replace("}", "");
            elem.value = e.items[0].name;
            elem.setAttribute("data-id", id);
        });
    };

    var onError = function (error) {
        alert("Operation Failed :" + error.message);
    };

    var onSuccessGetLinks = function (links, tasks) {
        tasks.links = [];
        for (var i = 0; i < links.length; i++) {
            tasks.links[i] = {
                id: links[i].xrm_taskdependencyId,
                source: links[i].xrm_SourceTaskId.Id,
                target: links[i].xrm_TargetTaskId.Id
            }
            switch (links[i].xrm_TypeCode.Value) {
                case 163650000:
                    tasks.links[i].type = "0";
                    break;
                case 163650001:
                    tasks.links[i].type = "1";
                    break;
                case 163650002:
                    tasks.links[i].type = "2";
                    break;
                case 163650003:
                    tasks.links[i].type = "3";
                    break;
            }
        }

        gantt.init("gantt_here");

        gantt.parse(tasks);
    };

    var getLinks = function (tasks) {
        SDK.REST.retrieveMultipleRecords(
            "xrm_taskdependency",
            "$select=xrm_taskdependencyId,xrm_SourceTaskId,xrm_TargetTaskId,xrm_TypeCode&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
            function (data) {
                onSuccessGetLinks(data, tasks);
            },
            function (data) {
                onError(data);
            },
            function () { });

    };

    var onSuccessGetTasks = function (results) {
        var tasks = {};
        tasks.links = [];
        tasks.data = [];
        if (!results) return;
        for (var i = 0; i < results.length; i++) {

            tasks.data[i] = {
                id: results[i].ActivityId,
                text: results[i].Subject,
                start_date: results[i].ActualStart,
                end_date: results[i].ActualEnd,
                duration: results[i].ActualDurationMinutes / 1440,
                parent: results[i].xrm_ParentGanttId.Id,
                progress: results[i].PercentComplete / 100,
                priority: results[i].PriorityCode.Value,
                owner: results[i].OwnerId.Id,
                ownerName: results[i].OwnerId.Name
            }
        }
        getLinks(tasks);

    };

    var getTasks = function () {
        SDK.REST.retrieveMultipleRecords(
            "Task",
            "$select=ActivityId,Subject,ActualStart,ActualDurationMinutes,ActualEnd,xrm_ParentGanttId,PercentComplete,PriorityCode,OwnerId&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
            function (data) {
                onSuccessGetTasks(data);
            },
            function (data) {
                onError(data);
            },
            function () { });
    };

    var onAfterTaskAdd = function () {
        gantt.attachEvent("onAfterTaskAdd", function (id, item) {
            if (!id) return;
            var task = gantt.getTask(id);

            var taskCrm = {
                Subject: task.text,
                ActualStart: new Date(task.start_date),
                ActualDurationMinutes: task.duration * 1440,
                ActualEnd: new Date(task.end_date),
                PriorityCode: { Value: task.priority },
                xrm_ProjectId: {
                    Id: window.parent.Xrm.Page.data.entity.getId(),
                    LogicalName: window.parent.Xrm.Page.data.entity.getEntityName(),
                    Name: window.parent.Xrm.Page.data.entity.getPrimaryAttributeValue()
                }
            };

            if (!isEmpty(task.owner)) {
                taskCrm.OwnerId = {
                    Id: task.owner,
                    LogicalName: "systemuser",
                    Name: task.ownerName
                }
            }

            if (task.parent !== 0) {
                var taskParent = gantt.getTask(task.parent);
                taskCrm.xrm_ParentGanttId = {
                    Id: taskParent.id,
                    LogicalName: "task",
                    Name: taskParent.text
                }
            }

            SDK.REST.createRecord(taskCrm,
                "Task",
                function (record) {
                    gantt.changeTaskId(task.id, record.ActivityId);
                },
                function (data) {
                    onError(data);
                });
        });
    };

    var onBeforeTaskUpdate = function () {
        gantt.attachEvent("onBeforeTaskUpdate", function (id, item) {
            if (!id) return;
            var task = gantt.getTask(id);
            var taskCrm = {
                Subject: task.text,
                ActualStart: new Date(task.start_date),
                ActualDurationMinutes: task.duration * 1440,
                ActualEnd: new Date(task.end_date),
                PercentComplete: Math.round(task.progress * 100),
                xrm_ProjectId: {
                    Id: window.parent.Xrm.Page.data.entity.getId(),
                    LogicalName: window.parent.Xrm.Page.data.entity.getEntityName(),
                    Name: window.parent.Xrm.Page.data.entity.getPrimaryAttributeValue()
                }
            };

            if (!isEmpty(task.owner)) {
                taskCrm.OwnerId = {
                    Id: task.owner,
                    LogicalName: "systemuser",
                    Name: task.ownerName
                }
            }

            if (task.parent !== 0) {
                var taskParent = gantt.getTask(task.parent);
                taskCrm.xrm_ParentGanttId = {
                    Id: taskParent.id,
                    LogicalName: "task",
                    Name: taskParent.text
                }
            }

            SDK.REST.updateRecord(id,
                taskCrm,
                "Task",
                function (record) { },
                function (data) {
                    onError(data);
                });
        });
    };

    var onBeforeTaskDelete = function () {
        gantt.attachEvent("onBeforeTaskDelete", function (id, item) {
            if (!id) return;
            var toDelete = [];
            var toDeleteL = [];
            var j = 0;
            var k = 0;

            function recursivedelete() {
                SDK.REST.deleteRecord(toDelete[j],
                    "Task",
                    function (record) {
                        j++;
                        if (j < toDelete.length)
                            recursivedelete();
                    },
                    function (data) {
                        onError(data);
                    });
            }

            function recursiveLinkdelete() {
                if (toDeleteL.length < 1) return;
                SDK.REST.deleteRecord(toDeleteL[k],
                    "xrm_taskdependency",
                    function (record) {
                        k++;
                        if (k < toDeleteL.length)
                            recursiveLinkdelete();
                    },
                    function (data) {
                        onError(data);
                    });
            }

            toDelete[0] = id;
            var links = gantt.getLinks();
            for (var i = 0; i < toDelete.length; i++) {
                if (!gantt.hasChild(toDelete[i])) continue;

                toDelete.push.apply(toDelete, gantt.getChildren(toDelete[i]));
            }
            for (var l = 0; l < links.length; l++) {
                for (var m = 0; m < toDelete.length; m++) {
                    if (links[l].source === toDelete[m] || links[l].target === toDelete[m]) {
                        toDeleteL.push(links[l].id);
                        m = toDelete.length;
                    }
                }
            }
            recursiveLinkdelete();
            recursivedelete();
        });
    };

    var onAfterLinkAdd = function () {
        gantt.attachEvent("onAfterLinkAdd", function (id, item) {
            if (!id) return;
            var link = gantt.getLink(id);
            var tSource = gantt.getTask(link.source);
            var tTarget = gantt.getTask(link.target);
            var linkCrm = {
                xrm_TargetTaskId: {
                    Id: link.target,
                    LogicalName: "task",
                    Name: tTarget.text
                },
                xrm_SourceTaskId: {
                    Id: link.source,
                    LogicalName: "task",
                    Name: tSource.text
                },
                xrm_ProjectId: {
                    Id: window.parent.Xrm.Page.data.entity.getId(),
                    LogicalName: window.parent.Xrm.Page.data.entity.getEntityName(),
                    Name: window.parent.Xrm.Page.data.entity.getPrimaryAttributeValue()
                }
            };
            switch (link.type) {
                case "0":
                    linkCrm.xrm_TypeCode = { Value: 163650000 };
                    break;
                case "1":
                    linkCrm.xrm_TypeCode = { Value: 163650001 };
                    break;
                case "2":
                    linkCrm.xrm_TypeCode = { Value: 163650002 };
                    break;
                case "3":
                    linkCrm.xrm_TypeCode = { Value: 163650003 };
                    break;
            }

            SDK.REST.createRecord(linkCrm,
                "xrm_taskdependency",
                function (record) {
                    gantt.changeLinkId(link.id, record.xrm_taskdependencyId);
                },
                function (data) {
                    onError(data);
                });
        });
    };

    var onBeforeLinkDelete = function () {
        gantt.attachEvent("onBeforeLinkDelete", function (id, item) {
            if (!id) return;
            SDK.REST.deleteRecord(id,
                "xrm_taskdependency",
                function (record) { },
                function (data) {
                    onError(data);
                });
        }
        );
    };

    var attachGanntEvents = function () {
        onAfterTaskAdd();
        onBeforeTaskUpdate();
        onBeforeTaskDelete();
        onAfterLinkAdd();
        onBeforeLinkDelete();
    };

    var timeScalingOnLoadFunctions = function () {
        gantt.config.details_on_create = true;

        gantt.config.columns = [
            {
                name: "text",
                label: "Task name",
                width: "*",
                tree: true
            },
            {
                name: "progress",
                label: "Progress",
                template: function (obj) {
                    if (isEmpty(obj.progress)) {
                        return "0%";
                    }
                    return Math.round(obj.progress * 100) + "%";
                },
                align: "center",
                width: 60
            },
            {
                name: "priority",
                label: "Priority",
                template: function (obj) {
                    return gantt.getLabel("priority", obj.priority);
                },
                align: "center",
                width: 60
            },
            {
                name: "duration",
                label: "Duration",
                width: 120,
                template: durationTemplate,
                align: "center"
            },
            {
                name: "add",
                label: "",
                width: 44
            }
        ];

        gantt.config.grid_width = 510;

        gantt.config.types["appointment"] = "appointmentid";
        gantt.locale.labels["type_appointment"] = "Appointment";

        gantt.config.lightbox["appointment_sections"] = [
            {
                name: "title",
                height: 20,
                map_to: "text",
                type: "textarea",
                focus: true
            },
            {
                name: "details",
                height: 70,
                map_to: "details",
                type: "textarea"
            },
            {
                name: "type",
                type: "typeselect",
                map_to: "type"
            },
            {
                name: "time",
                height: 72,
                type: "time",
                map_to: "auto"
            }
        ];

        var opts = [
            {
                key: 1,
                label: "Task"
            },
            {
                key: 2,
                label: "Appointment"
            }
        ];
        gantt.locale.labels.section_entitytype = "Type";
        gantt.locale.labels.section_owner = "Owner";

        gantt.form_blocks["my_editor"] = {
            render: function (sns) {
                return "<div class='gantt_cal_ltext' style='height:60px;'><input type='text' class='lookupinput' onclick=\"xRM.GANTT.LookupFunction(this);\"' readonly data-id=''></div>";
            },
            set_value: function (node, value, task, section) {
                node.childNodes[0].value = task.ownerName || "";
                node.childNodes[0].setAttribute("data-id", task.owner || "");
            },
            get_value: function (node, task, section) {
                task.ownerName = node.childNodes[0].value;
                return node.childNodes[0].getAttribute("data-id");
            },
            focus: function (node) {
                var a = node.childNodes[0];
                a.select();
                a.focus();
            }
        };

        gantt.config.lightbox.sections = [
            {
                name: "description",
                height: 38,
                map_to: "text",
                type: "textarea",
                focus: true
            },
            {
                name: "type",
                type: "typeselect",
                map_to: "type"
            },
            {
                name: "entitytype",
                height: 22,
                type: "select",
                map_to: "entitytype",
                options: opts,
                default_value: 1
            },
            {
                name: "time",
                type: "duration",
                map_to: "auto",
                time_format: ["%d", "%m", "%Y", "%H:%i"]
            },
            {
                name: "owner",
                height: 200,
                map_to: "owner",
                type: "my_editor"
            }
        ];
    };

    var onLoad = function () {
        if (window.parent.Xrm.Page.getAttribute("xrm_name").getValue() != String.empty) {

            getTasks();
            attachGanntEvents();
            timeScalingOnLoadFunctions();
        }
    };

    var zoomTasks = function (node) {

        zoomLevel = ZOOM_LEVELS.DAY;

        switch (node.value) {
            case "hour":
                zoomLevel = ZOOM_LEVELS.HOUR;
                gantt.config.scale_unit = "day";
                gantt.config.date_scale = "%d %M";
                gantt.config.scale_height = 60;
                gantt.config.min_column_width = 30;
                gantt.config.subscales = [
                    { unit: "hour", step: 1, date: "%H" }
                ];
                break;
            case "day":
                zoomLevel = ZOOM_LEVELS.DAY;
                gantt.config.scale_unit = "day";
                gantt.config.step = 1;
                gantt.config.date_scale = "%d %M";
                gantt.config.subscales = [];
                gantt.config.scale_height = 27;
                gantt.config.min_column_width = 50;
                gantt.templates.date_scale = null;
                break;
            case "week":
                zoomLevel = ZOOM_LEVELS.WEEK;
                var weekScaleTemplate = function (date) {
                    var dateToStr = gantt.date.date_to_str("%d %M");
                    var endDate = gantt.date.add(gantt.date.add(date, 1, "week"), -1, "day");
                    return dateToStr(date) + " - " + dateToStr(endDate);
                };

                gantt.config.scale_unit = "week";
                gantt.config.step = 1;
                gantt.templates.date_scale = weekScaleTemplate;
                gantt.config.subscales = [
					{ unit: "day", step: 1, date: "%D" }
                ];
                gantt.config.scale_height = 50;
                break;
            case "month":
                zoomLevel = ZOOM_LEVELS.MONTH;
                gantt.config.scale_unit = "year";
                gantt.config.step = 1;
                gantt.config.date_scale = "%Y";
                gantt.config.min_column_width = 50;

                gantt.config.scale_height = 50;
                gantt.templates.date_scale = null;


                gantt.config.subscales = [
					{ unit: "month", step: 1, date: "%M" }
                ];                break;
            case "year":
                zoomLevel = ZOOM_LEVELS.YEAR;
                gantt.config.scale_unit = "year";
                gantt.config.step = 1;
                gantt.config.date_scale = "%Y";
                gantt.config.min_column_width = 50;

                gantt.config.scale_height = 50;
                gantt.templates.date_scale = null;


                gantt.config.subscales = [
					{ unit: "month", step: 1, date: "%M" }
                ];
                break;
        }
        gantt.render();
    };

    var hideGantt = function () {
        if (Xrm.Page.getAttribute("xrm_name").getValue() == String.empty) {
            Xrm.Page.ui.tabs.get("GANTT_tab").setVisible(false);
        } else {
            Xrm.Page.ui.tabs.get("GANTT_tab").setVisible(true);
        }
    };

    return {
        OnLoad: onLoad,
        ZoomTasks: zoomTasks,
        LookupFunction: lookupFunction,
        HideGantt: hideGantt
    };

})();