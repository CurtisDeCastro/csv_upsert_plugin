import React, { useEffect } from 'react';
import JSGantt from 'jsgantt-improved';
import 'jsgantt-improved/dist/jsgantt.css';
import {
  client,
  useConfig,
  useElementData,
} from "@sigmacomputing/plugin";

client.config.configureEditorPanel([
  { name: "source", type: "element" },
  {
    name: "id",
    type: "column",
    source: "source",
    allowMultiple: false,
    allowedTypes: ['text']
  },
  {
    name: "name",
    type: "column",
    source: "source",
    allowMultiple: false,
    allowedTypes: ['text']
  },
  {
    name: "start",
    type: "column",
    source: "source",
    allowMultiple: false,
    allowedTypes: ['datetime']
  },
  {
    name: "end",
    type: "column",
    source: "source",
    allowMultiple: false,
    allowedTypes: ['datetime']
  },
]);

function App() {
  const config = useConfig();
  const sigmaData = useElementData(config.source);
  console.log(sigmaData);
  
  useEffect(() => {
    if (!sigmaData) return; // Exit early if sigmaData is null

    const g = new JSGantt.GanttChart(document.getElementById('GanttChartDIV'), 'day');
    if (g.getDivId() != null) {
      g.setOptions({
        vCaptionType: 'Complete',  // Set to Show Caption (None,Caption,Complete)
        vQuarterColWidth: 36,
        vDateTaskDisplayFormat: 'day dd month yyyy', // Shown in tool tip box
        vDayMajorDateDisplayFormat: 'mon yyyy - Week ww', // Set format to display dates in the "Major" header of the "Day" view
        vWeekMinorDateDisplayFormat: 'dd mon', // Set format to display dates in the "Minor" header of the "Week" view
        vLang: 'en',
        vShowTaskInfoLink: 0, // Show link in tool tip (0/1)
        vShowEndWeekDate: 0, // Show/Hide the date for the last day of the week in header for daily view (0/1)
        vShowRes: 0,
        vShowDur: 0,
        vShowComp: 0,
        vShowStartDate: 0,
        vShowEndDate: 0,
      });

      if (config.id && config.name && config.start && config.end) {
        const idData = sigmaData[config.id];
        const nameData = sigmaData[config.name];
        const startData = sigmaData[config.start];
        const endData = sigmaData[config.end];

        if (idData && nameData && startData && endData) {
          const tasks = idData.map((id, index) => {
            const start = new Date(startData[index]);
            const end = endData[index] ? new Date(endData[index]) : start;

            // Ensure start date is not after end date
            if (start > end) {
              console.error(`Start date is after end date for task id: ${id}`);
              return null; // Skip this task
            }

            return {
              pID: id,
              pName: nameData[index],
              pStart: start.toISOString().split('T')[0],
              pEnd: end.toISOString().split('T')[0],
              pClass: 'gtaskblue', // Default class, can be customized
              pLink: '',
              pMile: 0,
              pComp: 0, // Assuming progress is not available in the data
              pGroup: 0,
              pParent: 0,
              pOpen: 1,
              pDepend: '', // Assuming dependencies are not available in the data
              pCaption: ''
            };
          }).filter(task => task !== null); // Filter out any null tasks

          tasks.forEach(task => g.AddTaskItemObject(task));
        }
      }

      g.Draw();
    }
  }, [sigmaData]); // Add sigmaData as a dependency to re-run effect when it changes

  return (
    <div className="App" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div id="GanttChartDIV" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
}

export default App;
