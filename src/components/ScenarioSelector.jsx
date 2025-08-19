import React from 'react';
import { ChevronDown } from 'lucide-react';

const ScenarioSelector = ({ scenarios, currentScenario, onScenarioChange }) => {
  const current = scenarios[currentScenario]

  return (
    <div className="flex items-center space-x-2">
      {Object.values(scenarios).map((scenario) => {
        const isActive = scenario.id === currentScenario
        return (
          <button
            key={scenario.id}
            onClick={() => onScenarioChange(scenario.id)}
            className={
              `flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 ` +
              (isActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700')
            }
            title={scenario.description}
          >
            <div className={
              `icon-container ` +
              (isActive
                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400')
            }>
              <scenario.icon className="w-4 h-4" />
            </div>
            <div className="text-sm font-medium">{scenario.name}</div>
          </button>
        )
      })}
    </div>
  )
}

export default ScenarioSelector