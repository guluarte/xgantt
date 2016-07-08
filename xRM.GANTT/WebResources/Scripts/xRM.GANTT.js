/// <reference path="SDK.REST.js" />
/// <reference path="../../scripts/typings/xrm/xrm.d.ts" />
/// <reference path="../../scripts/dhtmlxgantt.js" />

var xRM = xRM || {};

// ReSharper disable UnusedParameter
// ReSharper disable Html.EventNotResolved
xRM.GANTT = (function () {

    var log = function (msg) {
        //console.log(msg);
    };

    var EntityNames = {
        Task: {
            LogicalName: "task",
            SchemaName: "Task"
        },
        Appointment: {
            LogicalName: "appointment",
            SchemaName: "Appointment"
        },
        Opportunity: {
            LogicalName: "opportunity",
            SchemaName: "Opportunity"
        },
        User: {
            LogicalName: "systemuser",
            SchemaName: "SystemUser"
        },
        Project: {
            LogicalName: "xrm_project",
            SchemaName: "xrm_project"
        },
        TaskDependency: {
            LogicalName: "xrm_taskdependency",
            SchemaName: "xrm_taskdependency"
        }
    };

    //var TaskTypeGanttCode = {
    //    TASK: 163650000,
    //    PROJECT: 163650001,
    //    MILESTONE: 163650002
    //};

    var TypeCode = {
        FinishToStart: 163650000,
        StartToStart: 163650001,
        FinishToFinish: 163650002,
        StartToFinish: 163650003
    };

    var EntityTypes = [
        {
            key: "1",
            label: "Task"
        },
        {
            key: "2",
            label: "Appointment"
        }
    ];

    var ZoomLevels = {
        Hour: 10,
        Day: 20,
        Week: 30,
        Month: 40,
        Year: 1000
    };

    var zoomLevel = ZoomLevels.Day;

    var UserObjectTypeCode = 8;

    var isEmpty = function (value) {
        return (value == null || value.length === 0);
    };

    var durationTemplate = function (obj) {

        var duration = obj.duration;

        if (duration === 0) {
            return duration;
        }

        switch (zoomLevel) {

            case ZoomLevels.Hour:
                return duration;
            case ZoomLevels.Day:
                {
                    return parseFloat(duration / 24).toFixed(1);
                }
            case ZoomLevels.Week:
                {
                    var hoursPerWeek = 7 * 24;
                    if (duration % hoursPerWeek === 0) {
                        return duration / hoursPerWeek;
                    }
                    return parseFloat(duration / hoursPerWeek).toFixed(1);
                }
            case ZoomLevels.Month:
                {
                    var hoursPerMonth = 30 * 24;
                    if (duration % hoursPerMonth === 0) {
                        return duration / hoursPerMonth;
                    }
                    return parseFloat(duration / hoursPerMonth).toFixed(1);
                }

            case ZoomLevels.Year:
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

        openLookup(UserObjectTypeCode, function (e) {

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

    var serverTasks = {
        links: [],
        data: []
    };

    var parseTasks = function () {
        gantt.parse(serverTasks);
    };

    var setupGannt = function () {

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
                        //{
                        //    name: "priority",
            //    label: "Priority",
            //    template: function (obj) {
            //        return gantt.getLabel("priority", obj.priority);
            //    },
            //    align: "center",
                //    width: 60
                //},
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

        gantt.locale.labels.section_entitytype = "Type";

        gantt.locale.labels.section_owner = "Owner";

        gantt.form_blocks["lookupEditor"] = {
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

        gantt.form_blocks["typeEditor"] = {
            render: function (sns) {
                return "<div class='gantt_cal_ltext' style='height:60px;'><select style='width:100%;'><option value='1' selected>Task</option><option value='2'>Appointment</option></select></div>";
            },
            set_value: function (node, value, task, section) {

                var sectionId = section.id;
                var sectionDiv = document.getElementById(sectionId);
                var inpitDiv = sectionDiv.nextSibling;

                if (task.id.length > 30) { // already in the crm, disable change
                    sectionDiv.style.display = "none";
                    inpitDiv.style.display = "none";
                } else {
                    sectionDiv.style.display = "";
                    inpitDiv.style.display = "";
                }
                node.childNodes[0].value = task.entityType || "1";
                gantt.resizeLightbox(); //correct size of lightbox
            },
            get_value: function (node, task, section) {
                var selectedValue = node.childNodes[0].value;
                return selectedValue;
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
                            type: "typeEditor",
                            map_to: "entityType"
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
                    type: "lookupEditor"
                }
        ];

        gantt.templates.task_class = function (start, end, task) {
            if (task.entityType === EntityTypes[0].key) {
                return "entity_task";
            }
            if (task.entityType === EntityTypes[1].key) {
                return "entity_appointment";
            }
            return "entity_other";
        };

    };

    var formatGantt = function (timeValue) {

        timeValue = timeValue || "hour";

        zoomLevel = ZoomLevels.Day;

        gantt.config.duration_unit = "hour";//an hour
        switch (timeValue) {
            case "hour":
                zoomLevel = ZoomLevels.Hour;

                gantt.config.scale_unit = "day";
                gantt.config.date_scale = "%l, %F %d";
                gantt.config.min_column_width = 50;
                gantt.config.duration_unit = "hour";
                gantt.config.scale_height = 20 * 3;                gantt.config.subscales = [
                {
                    unit: "hour",
                    step: 1,
                    date: "%G"
                }                ];
                break;
            case "day":
                zoomLevel = ZoomLevels.Day;

                gantt.config.scale_unit = "day";
                gantt.config.step = 1;
                gantt.config.date_scale = "%d %M";
                gantt.config.subscales = [];
                gantt.config.scale_height = 27;
                gantt.config.min_column_width = 50;
                gantt.templates.date_scale = null;
                break;
            case "week":
                zoomLevel = ZoomLevels.Week;
                var weekScaleTemplate = function (date) {
                    var dateToStr = gantt.date.date_to_str("%d %M");
                    var endDate = gantt.date.add(gantt.date.add(date, 1, "week"), -1, "day");
                    return dateToStr(date) + " - " + dateToStr(endDate);
                };

                gantt.config.scale_unit = "week";
                gantt.config.step = 1;
                gantt.templates.date_scale = weekScaleTemplate;
                gantt.config.subscales = [
                    {
                        unit: "day", step: 1, date: "%D"
                    }
                ];
                gantt.config.scale_height = 50;
                break;
            case "month":
                zoomLevel = ZoomLevels.Month;
                gantt.config.scale_unit = "year";
                gantt.config.step = 1;
                gantt.config.date_scale = "%Y";
                gantt.config.min_column_width = 50;

                gantt.config.scale_height = 50;
                gantt.templates.date_scale = null;


                gantt.config.subscales = [
                    {
                        unit: "month", step: 1, date: "%M"
                    }
                ];                break;
            case "year":
                zoomLevel = ZoomLevels.Year;
                gantt.config.scale_unit = "year";
                gantt.config.step = 1;
                gantt.config.date_scale = "%Y";
                gantt.config.min_column_width = 50;

                gantt.config.scale_height = 50;
                gantt.templates.date_scale = null;


                gantt.config.subscales = [
                    {
                        unit: "month", step: 1, date: "%M"
                    }
                ];
                break;
        }

        gantt.render();
        parseTasks();
    };

    var initGannt = function () {
        setupGannt();
        gantt.init("gantt_here");
        formatGantt();
    };

    var onSuccessGetLinks = function (links) {

        serverTasks.links = [];

        for (var i = 0; i < links.length; i++) {
            serverTasks.links[i] = {
                id: links[i].xrm_taskdependencyId,
                source: links[i].xrm_SourceId,
                target: links[i].xrm_TargetId
            }
            switch (links[i].xrm_TypeCode.Value) {
                case TypeCode.FinishToStart:
                    serverTasks.links[i].type = "0";
                    break;
                case TypeCode.StartToStart:
                    serverTasks.links[i].type = "1";
                    break;
                case TypeCode.FinishToFinish:
                    serverTasks.links[i].type = "2";
                    break;
                case TypeCode.StartToFinish:
                    serverTasks.links[i].type = "3";
                    break;
            }
        }



    };

    var getLinks = function () {
        log("Retrieving links");

        SDK.REST.retrieveMultipleRecords(
            EntityNames.TaskDependency.SchemaName,
            "$select=xrm_taskdependencyId,xrm_SourceId,xrm_TargetId,xrm_TypeCode&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
            function (data) {
                onSuccessGetLinks(data);
            },
            function (data) {
                onError(data);
            },
            function () {
            });

        initGannt();
    };

    var onSuccessGetTasksEntities = function (results) {

        if (!results) return;

        for (var i = 0; i < results.length; i++) {

            serverTasks.data.push({
                id: results[i].ActivityId,
                text: results[i].Subject,
                start_date: results[i].ActualStart,
                end_date: results[i].ActualEnd,
                duration: results[i].ActualDurationMinutes / 1440,
                parent: results[i].xrm_ParentGanttId,
                progress: results[i].PercentComplete / 100,
                priority: results[i].PriorityCode.Value,
                owner: results[i].OwnerId.Id,
                ownerName: results[i].OwnerId.Name,
                entityType: EntityTypes[0].key
            });
        }

    };

    var onSuccessGetAppointMentEntities = function (results) {
        //ActivityId,Subject,ActualStart,ActualDurationMinutes,ActualEnd,xrm_ParentGanttId,xrm_Percent,OwnerId
        if (!results) return;

        for (var i = 0; i < results.length; i++) {
            serverTasks.data.push({
                id: results[i].ActivityId,
                text: results[i].Subject,
                start_date: results[i].ActualStart,
                end_date: results[i].ActualEnd,
                duration: results[i].ActualDurationMinutes / 1440,
                parent: results[i].xrm_ParentGanttId,
                progress: results[i].xrm_Percent / 100,
                //priority: results[i].PriorityCode.Value,
                owner: results[i].OwnerId.Id,
                ownerName: results[i].OwnerId.Name,
                entityType: EntityTypes[1].key
            });
        }

    };

    var getTasks = function () {
        log("Retrieving tasks");
        SDK.REST.retrieveMultipleRecords(
           EntityNames.Task.SchemaName,
           "$select=ActivityId,Subject,ActualStart,ActualDurationMinutes,ActualEnd,xrm_ParentGanttId,PercentComplete,PriorityCode,OwnerId&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
            function (data) {
                onSuccessGetTasksEntities(data);
            },
            function (data) {
                onError(data);
            },
                function () { //OnComplete
                    log("Retrieving appointments");
                    SDK.REST.retrieveMultipleRecords(
                        EntityNames.Appointment.SchemaName,
                        "$select=ActivityId,Subject,ActualStart,ActualDurationMinutes,ActualEnd,xrm_ParentGanttId,xrm_Percent,OwnerId&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
                        function (data) {
                            onSuccessGetAppointMentEntities(data);
                        },
                        function (data) {
                            onError(data);
                        },
                            function () { //OnComplete
                                log("Retrieving links");
                                getLinks();

                            });
                });

    };

    var getProyectEntityReference = function () {
        return {
            Id: window.parent.Xrm.Page.data.entity.getId(),
            LogicalName: window.parent.Xrm.Page.data.entity.getEntityName(),
            Name: window.parent.Xrm.Page.data.entity.getPrimaryAttributeValue()
        }
    };

    var getOwnerEntityReference = function (task) {
        return {
            Id: task.owner,
            LogicalName: EntityNames.User.LogicalName,
            Name: task.ownerName
        };
    };
    var addOrUpdateTask = function (task, create) {

        create = create || false;

        var taskCrm = {
            Subject: task.text,
            ActualStart: new Date(task.start_date),
            ActualDurationMinutes: task.duration * 60,
            ActualEnd: new Date(task.end_date),
            //PriorityCode: {
            //     Value: task.priority
            //},
            xrm_ProjectId: getProyectEntityReference(),
            PercentComplete: Math.round((task.progress || 0) * 100)
        };

        taskCrm.ScheduledStart = taskCrm.ActualStart;
        taskCrm.ScheduledEnd = taskCrm.ActualEnd;

        if (!isEmpty(task.owner)) {
            taskCrm.OwnerId = getOwnerEntityReference(task);
        }

        if (task.parent !== 0) {
            taskCrm.xrm_ParentGanttId = task.parent;
        }

        if (create) {
            SDK.REST.createRecord(taskCrm,
            EntityNames.Task.SchemaName,
                function (record) {
                    gantt.changeTaskId(task.id, record.ActivityId);
                },
                function (data) {
                    onError(data);
                });

        } else {

            SDK.REST.updateRecord(task.id,
            taskCrm,
            EntityNames.Task.SchemaName,
            function (record) {
            },
            function (data) {
                onError(data);
            });
        }
    };

    var addOrUpdateAppointMent = function (task, create) {

        create = create || false;

        var appointmentCrm = {
            Subject: task.text,
            ActualStart: new Date(task.start_date),
            ActualDurationMinutes: task.duration * 60,
            ActualEnd: new Date(task.end_date),
            xrm_ProjectId: getProyectEntityReference(),
            xrm_Percent: Math.round((task.progress || 0) * 100)
        };

        appointmentCrm.ScheduledStart = appointmentCrm.ActualStart;
        appointmentCrm.ScheduledEnd = appointmentCrm.ActualEnd;

        if (!isEmpty(task.owner)) {
            appointmentCrm.OwnerId = getOwnerEntityReference(task);
        }

        if (task.parent !== 0) {
            appointmentCrm.xrm_ParentGanttId = task.parent;
        }

        if (create) {
            SDK.REST.createRecord(appointmentCrm,
            EntityNames.Appointment.SchemaName,
                function (record) {
                    gantt.changeTaskId(task.id, record.ActivityId);
                },
                function (data) {
                    onError(data);
                });

        } else {

            SDK.REST.updateRecord(task.id,
            appointmentCrm,
            EntityNames.Appointment.SchemaName,
            function (record) {
            },
            function (data) {
                onError(data);
            });
        }
    };

    var getAndCreateOrUpdateTask = function (id, create) {
        create = create || false;

        if (!id) return;

        var task = gantt.getTask(id);

        /* task */
        if (task.entityType === EntityTypes[0].key) {
            addOrUpdateTask(task, create);
            return;
        }

        /* appointment */
        if (task.entityType === EntityTypes[1].key) {
            addOrUpdateAppointMent(task, create);
            return;
        }
    };

    var onAfterTaskAdd = function () {

        gantt.attachEvent("onAfterTaskAdd", function (id, item) {

            if (!id) return;

            getAndCreateOrUpdateTask(id, true);

        });
    };
    var onBeforeTaskDrag = function () {

        gantt.attachEvent("onBeforeTaskDrag", function (id, mode, e) {

            if (!id) return false;

            getAndCreateOrUpdateTask(id, false);

            return true;

        });
    };

    var onBeforeTaskUpdate = function () {

        gantt.attachEvent("onBeforeTaskUpdate", function (id, item) {

            if (!id) return;

            getAndCreateOrUpdateTask(id, false);

        });
    };

    var onBeforeTaskDelete = function () {

        gantt.attachEvent("onBeforeTaskDelete", function (id, item) {
            if (!id) return;

            var idsDeleted = [];

            function deleteEntity(entity) {

                if (typeof idsDeleted[entity.id] !== "undefined") {
                    return; // alredy deleted
                }
                idsDeleted[entity.id] = true;

                SDK.REST.deleteRecord(entity.id, entity.schemaName,
                    function (record) {
                    },
                    function (data) {
                        onError(data);
                    });
            }

            var deleteTaksNode = function (taskId) {

                var task = gantt.getTask(taskId);

                var schemaName;

                if (task.entityType === EntityTypes[0].key) {
                    schemaName = EntityNames.Task.SchemaName;
                } else if (task.entityType === EntityTypes[1].key) {
                    schemaName = EntityNames.Appointment.SchemaName;
                } else {
                    return;
                }

                deleteEntity({
                    id: taskId, schemaName: schemaName
                });

                var links = gantt.getLinks();

                links.forEach(function (link) {
                    if (link.source === taskId || link.target === taskId) {
                        deleteEntity({
                            id: link.id, schemaName: EntityNames.TaskDependency.SchemaName
                        });
                    }
                });

                if (!gantt.hasChild(taskId)) {
                    return;
                };
                var taskChild = gantt.getChildren(taskId);

                taskChild.forEach(function (child) {
                    deleteTaksNode(child);
                });

            };

            deleteTaksNode(id);

        });
    };

    var onAfterLinkAdd = function () {

        gantt.attachEvent("onAfterLinkAdd", function (id, item) {
            if (!id) return;
            var link = gantt.getLink(id);

            var linkCrm = {
                xrm_TargetId: link.target,
                xrm_SourceId: link.source,
                xrm_ProjectId: getProyectEntityReference()
            };
            switch (link.type) {
                case "0":
                    linkCrm.xrm_TypeCode = {
                        Value: TypeCode.FinishToStart
                    };
                    break;
                case "1":
                    linkCrm.xrm_TypeCode = {
                        Value: TypeCode.StartToStart
                    };
                    break;
                case "2":
                    linkCrm.xrm_TypeCode = {
                        Value: TypeCode.FinishToFinish
                    };
                    break;
                case "3":
                    linkCrm.xrm_TypeCode = {
                        Value: TypeCode.StartToFinish
                    };
                    break;
            }

            SDK.REST.createRecord(linkCrm,
                                EntityNames.TaskDependency.SchemaName,
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
                EntityNames.TaskDependency.SchemaName,
                function (record) {
                },
                function (data) {
                    onError(data);
                });
        });
    };

    var onLightboxSave = function () {
        gantt.attachEvent("onLightboxSave", function (id, item) {
            if (!item.owner) {
                dhtmlx.message({ type: "error", text: "Choose a worker for this task." });
                return false;
            }
            if (!item.text) {
                dhtmlx.message({ type: "error", text: "Enter a task name." });
                return false;
            }
            return true;
        });
    };

    var attachGanntEvents = function () {
        onAfterTaskAdd();
        onBeforeTaskUpdate();
        onBeforeTaskDelete();
        onAfterLinkAdd();
        onBeforeLinkDelete();

        onBeforeTaskDrag();
        onLightboxSave();
    };


    var isProjectInitialized = function () {

        if (window.parent.Xrm.Page.getAttribute("xrm_name").getValue() === null) {
            return false;
        }

        if (window.parent.Xrm.Page.getAttribute("xrm_name").getValue() === "") {
            return false;
        }

        return true;
    };

    var hideGantt = function () {
        if (!isProjectInitialized()) {
            Xrm.Page.ui.tabs.get("GANTT_tab").setVisible(false);
        } else {
            Xrm.Page.ui.tabs.get("GANTT_tab").setVisible(true);
        }
    };

    var onLoad = function () {
        if (isProjectInitialized()) {

            getTasks();
            attachGanntEvents();

        } else {

            hideGantt();

        }
    };

    var zoomTasks = function (node) {

        formatGantt(node.value);

    };

    return {
        OnLoad: onLoad,
        ZoomTasks: zoomTasks,
        LookupFunction: lookupFunction,
        HideGantt: hideGantt
    };

})();
// ReSharper restore UnusedParameter
// ReSharper restore Html.EventNotResolved