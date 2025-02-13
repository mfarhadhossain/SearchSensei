import React, {useEffect, useRef, useState} from 'react';
import {SensitivityTerm} from '../types';
import {Button} from 'primereact/button';
import {Dialog} from 'primereact/dialog';
import {Dropdown} from 'primereact/dropdown';
import 'primeicons/primeicons.css';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import './SanitizerPanel.css';


interface SanitizerPanelProps {
    originalQuery: string;
    sensitiveTerms: SensitivityTerm[];
    onConfirm: (updatedQuery: string) => void;
    onCancel: () => void;
}

const SanitizerPanel: React.FC<SanitizerPanelProps> = ({
                                                           originalQuery,
                                                           sensitiveTerms,
                                                           onConfirm,
                                                           onCancel,
                                                       }) => {
    const [userChoices, setUserChoices] = useState<{ [key: string]: string }>({});
    const [updatedQuery, setUpdatedQuery] = useState(originalQuery);
    const placeholderCounters = useRef<{ [key: string]: number }>({});
    const placeholders = useRef<{ [key: string]: string }>({});

    useEffect(() => {
        // Initializes user choices to 'keep' for all sensitive terms
        const initialChoices = sensitiveTerms.reduce((acc, term) => {
            acc[term.text] = 'keep'; // Default to 'Keep'
            return acc;
        }, {} as { [key: string]: string });

        setUserChoices(initialChoices);

        placeholderCounters.current = {};
        placeholders.current = {};
    }, [sensitiveTerms]);

    useEffect(() => {
        // Update the query preview whenever user choices change
        let newQuery = originalQuery;
        for (const [term, action] of Object.entries(userChoices)) {
            let replacement: string = term;
            if (action === 'replace') {
                if (!placeholders.current[term]) {
                    const termInfo = sensitiveTerms.find((t) => t.text === term);
                    if (termInfo) {
                        const {entity_type} = termInfo;
                        if (!placeholderCounters.current[entity_type]) {
                            placeholderCounters.current[entity_type] = 1;
                        }
                        const placeholder = `[${entity_type}${placeholderCounters.current[entity_type]}]`;
                        placeholderCounters.current[entity_type] += 1;
                        placeholders.current[term] = placeholder;
                    }
                }
                replacement = placeholders.current[term];
            } else if (action === 'abstract') {
                const termInfo = sensitiveTerms.find((t) => t.text === term);
                replacement = termInfo ? termInfo.abstract : term;
            }
            const regex = new RegExp(
                `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
                'gi'
            );
            newQuery = newQuery.replace(regex, replacement);
        }
        setUpdatedQuery(newQuery);
    }, [userChoices, originalQuery, sensitiveTerms]);

    // Handles user action selection for each sensitive term
    const handleChoiceChange = (termInfo: SensitivityTerm, action: string) => {
        setUserChoices((prevChoices) => ({
            ...prevChoices,
            [termInfo.text]: action,
        }));
    };

    const footer = (
        <div>
            <Button
                label="Cancel"
                severity="danger"
                className="p-button-cancel"
                onClick={onCancel}
            />
            <Button
                label="Confirm"
                severity="success"
                className="p-button-confirm"
                onClick={() => onConfirm(updatedQuery)}
                autoFocus
            />
        </div>
    );

    return (
        <Dialog
            header="Sanitize Your Query"
            visible
            modal
            onHide={onCancel}
            footer={footer}
            className="sanitizer-dialog"
            style={{
                width: '600px',
                minWidth: '400px',
                maxWidth: '90vw',
                borderRadius: '12px',
                overflow: 'hidden',
            }}
            contentStyle={{
                minHeight: '400px',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}
            breakpoints={{
                '1024px': '75vw',
                '768px': '90vw',
                '480px': '95vw',
            }}
        >
            <p>
                We've detected sensitive information in your query. Please choose how to
                handle each term:
            </p>
            {sensitiveTerms.map((termInfo, index) => (
                <div key={index} className="p-field">
                    <label
                        htmlFor={`term-${index}`}
                    >{`${termInfo.text} (${termInfo.entity_type})`}</label>
                    <Dropdown
                        id={`term-${index}`}
                        value={userChoices[termInfo.text]}
                        options={[
                            {
                                label: `Keep ("${termInfo.text}")`,
                                value: 'keep',
                            },
                            {
                                label: `Replace with "[${termInfo.entity_type}]"`,
                                value: 'replace',
                            },
                            {
                                label: `Abstract as "${termInfo.abstract}"`,
                                value: 'abstract',
                            },
                        ]}
                        onChange={(e) => handleChoiceChange(termInfo, e.value)}
                        placeholder="Select an action"
                        className="p-inputgroup"
                    />
                </div>
            ))}
            <div className="query-preview">
                <h4>Updated Query Preview:</h4>
                <p>{updatedQuery}</p>
            </div>
        </Dialog>
    );
};

export default SanitizerPanel;
