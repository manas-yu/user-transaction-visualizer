import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="bg-gray-800 text-white">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <div className="logo">
                    <Link to="/" className="text-xl font-bold">
                        Transaction Graph Visualizer
                    </Link>
                </div>

                <nav>
                    <ul className="flex space-x-4">
                        <li>
                            <Link to="/" className="hover:text-gray-300">
                                Dashboard
                            </Link>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
};

export default Header;