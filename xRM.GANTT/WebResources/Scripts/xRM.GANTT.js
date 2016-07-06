/// <reference path="SDK.REST.js" />
/// <reference path="../../scripts/typings/xrm/xrm.d.ts" />
/// <reference path="../../scripts/dhtmlxgantt.js" />

if (typeof (xRM) == "undefined")
{ xRM = { __namespace: true }; }

xRM.FORM_TYPES = {
    UNDEFINED: 0,
    CREATE: 1,
    UPDATE: 2,
    READ_ONLY: 3,
    DISABLED: 4,
    QUICK_CREATE: 5,
    BULK_EDIT: 6,
    READ_OPTMIZED: 11
};

xRM.TASK_TYPE_GANTT_CODE = {
    TASK: 163650000,
    PROJECT: 163650001,
    MILESTONE: 163650002
};

xRM.TYPE_CODE = {
    FINISH_TO_START: 163650000,
    START_TO_START: 163650001,
    FINISH_TO_FINISH: 163650002,
    START_TO_FINISH: 163650003
};

xRM.GANTT = {
    OnLoad: function () {

        if (window.parent.Xrm.Page.ui.getFormType() !== xRM,FORM_TYPES.CREATE || Window.parent.Xrm.Page.ui.getFormType() !== xRM,FORM_TYPES.QUICK_CREATE) {
            xRM.GANTT.GetTasks();
            xRM.GANTT.AttachGanntEvents();
        }
    },
    GetTasks: function () {
        SDK.REST.retrieveMultipleRecords(
            "Task",
            "$select=ActivityId, Subject,ActualStart,ActualDurationMinutes,ActualEnd,xrm_ParentGanttId,PercentComplete&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
            function (data) { xRM.GANTT.OnSuccessGetTasks(data) },
            function (data) { xRM.GANTT.OnError(data) },
            function () { });
    },
    OnSuccessGetTasks: function (results) {
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
                progress: results[i].PercentComplete / 100
            }
        }
        xRM.GANTT.GetLinks(tasks);
    },
    GetLinks: function (tasks) {
        SDK.REST.retrieveMultipleRecords(
            "xrm_taskdependency",
            "$select=xrm_taskdependencyId,xrm_SourceTaskId,xrm_TargetTaskId,xrm_TypeCode&$filter=xrm_ProjectId/Id eq guid'" + window.parent.Xrm.Page.data.entity.getId() + "'",
            function (data) { xRM.GANTT.OnSuccessGetLinks(data, tasks) },
            function (data) { xRM.GANTT.OnError(data) },
            function () { });

    },
    OnSuccessGetLinks: function (links, tasks) {
        tasks.links = [];
        for (var i = 0; i < links.length; i++) {
            tasks.links[i] = {
                id: links[i].xrm_taskdependencyId,
                source: links[i].xrm_SourceTaskId.Id,
                target: links[i].xrm_TargetTaskId.Id
            }
            switch (links[i].xrm_TypeCode.Value) {
                case xRM.TYPE_CODE.FINISH_TO_START:
                    tasks.links[i].type = "0";
                    break;
                case xRM.TYPE_CODE.START_TO_START:
                    tasks.links[i].type = "1";
                    break;
                case xRM.TYPE_CODE.FINISH_TO_FINISH:
                    tasks.links[i].type = "2";
                    break;
                case xRM.TYPE_CODE.START_TO_FINISH:
                    tasks.links[i].type = "3";
                    break;
            }
        }
        gantt.init("gantt_here");
        gantt.parse(tasks);
    },
    OnError: function (error) {
        alert("Operation Failed :" + error.message);
    },
    AttachGanntEvents: function () {
        gantt.attachEvent("onAfterTaskAdd", xRM.GANTT.OnAfterTaskAdd());
        gantt.attachEvent("onBeforeTaskUpdate", xRM.GANTT.OnBeforeTaskUpdate());
        gantt.attachEvent("onBeforeTaskDelete", xRM.GANTT.OnBeforeTaskDelete());
        gantt.attachEvent("onAfterLinkAdd", xRM.GANTT.OnAfterLinkAdd());
        gantt.attachEvent("onBeforeLinkDelete", xRM.GANTT.OnBeforeLinkDelete());
    },
    OnAfterTaskAdd: function (id, item) {
        if (!id) return;
        var task = gantt.getTask(id);
        var taskCrm = {
            Subject: task.text,
            ActualStart: new Date(task.start_date),
            ActualDurationMinutes: task.duration * 1440,
            ActualEnd: new Date(task.end_date),
            xrm_ProjectId: {
                Id: window.parent.Xrm.Page.data.entity.getId(),
                LogicalName: window.parent.Xrm.Page.data.entity.getEntityName(),
                Name: window.parent.Xrm.Page.data.entity.getPrimaryAttributeValue()
            }
        };

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
            function (record) { gantt.changeTaskId(task.id, record.ActivityId); },
            function (data) { xRM.GANTT.OnError(data) });
    },
    OnBeforeTaskUpdate: function (id, item) {
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
            function (data) { xRM.GANTT.OnError(data) });
    },
    OnBeforeTaskDelete: function (id, item) {
        if (!id) return;
        var toDelete = [];
        var toDeleteL = [];
        var j = 0;
        var k = 0;

        function recursivedelete() {
            SDK.REST.deleteRecord(toDelete[j],
                "Task",
                function (record) {
                    alert("deleted " + j);
                    j++;
                    if (j < toDelete.length)
                        recursivedelete();
                },
                function (data) { xRM.GANTT.OnError(data) });
        }

        function recursiveLinkdelete() {
            SDK.REST.deleteRecord(toDeleteL[k],
                "xrm_taskdependency",
                function (record) {
                    alert("deleted " + k);
                    k++;
                    if (k < toDeleteL.length)
                        recursiveLinkdelete();
                },
                function (data) { xRM.GANTT.OnError(data) });
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
    },
    OnAfterLinkAdd: function (id, item) {
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
                linkCrm.xrm_TypeCode = { Value: xRM.TYPE_CODE.FINISH_TO_START };
                break;
            case "1":
                linkCrm.xrm_TypeCode = { Value: xRM.TYPE_CODE.START_TO_FINISH };
                break;
            case "2":
                linkCrm.xrm_TypeCode = { Value: xRM.TYPE_CODE.FINISH_TO_FINISH };
                break;
            case "3":
                linkCrm.xrm_TypeCode = { Value: xRM.TYPE_CODE.START_TO_FINISH };
                break;
        }

        SDK.REST.createRecord(linkCrm,
            "xrm_taskdependency",
            function (record) {
                gantt.changeLinkId(link.id, record.xrm_taskdependencyId);
            },
            function (data) { xRM.GANTT.OnError(data) });
    },
    OnBeforeLinkDelete: function (id, item) {
        if (!id) return;
        SDK.REST.deleteRecord(id,
                   "xrm_taskdependency",
                   function (record) { },
                   function (data) { xRM.GANTT.OnError(data) });
    }
};
