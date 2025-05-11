import { useState } from 'react';
import Graph from '../components/Graph';
import Header from '../components/Header';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('graph');

    return (
        <div className="dashboard">
            <Header />

            <div className="container mx-auto p-4">
                <h1 className="text-2xl font-bold mb-4">Relationship Visualization Dashboard</h1>

                <div className="tabs mb-4">
                    <button
                        className={`tab ${activeTab === 'graph' ? 'active' : ''}`}
                        onClick={() => setActiveTab('graph')}
                    >
                        Graph View
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'graph' && <Graph />}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;