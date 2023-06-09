import { useContext, useEffect, useState } from "react"
import Avatar from "./Avatar";
import Logo from "./Logo";
import { UserContext } from "./UserContext.jsx"


export default function Chat() {

    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessageText, setNewMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const { username, id } = useContext(UserContext)

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:4000');
        setWs(ws);
        ws.addEventListener('message', handleMessage)
    }, [selectedUserId]);

    function showOnlinePeople(peopleArray) {

        const people = {};
        peopleArray.forEach(({ userId, username }) => {
            people[userId] = username;
        })
        // console.log(people)
        setOnlinePeople(people);
    }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data);
        if ('online' in messageData) {
            showOnlinePeople(messageData.online);
        } else {
            setMessages(prev => ([...prev, { isOur: false, text: messageData.text }]));
        }
    }

    function sendMessage(ev) {
        ev.preventDefault();
        ws.send(JSON.stringify(
            {
                recipient: selectedUserId,
                text: newMessageText,
            }
        ));
        setNewMessageText('')
        setMessages(prev => ([...prev,{text: newMessageText, isOur:true}]));
    }

    // does not work because onlinePeople is an object.
    // const onlinePeopleExclOurUser = onlinePeople.filter(p => p.username !== username );

    const onlinePeopleExclOurUser = { ...onlinePeople };
    delete onlinePeopleExclOurUser[id]


    return (
        <div className="flex h-screen">
            <div className="bg-blue-100 w-1/3 p-2">
                <Logo />
                <p>
                    Logged in as {username}
                </p>
                {Object.keys(onlinePeopleExclOurUser).map(userId => (
                    // eslint-disable-next-line react/jsx-key
                    <div
                        key={userId}
                        onClick={() => setSelectedUserId(userId)}
                        className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer " + (userId === selectedUserId ? 'bg-blue-500' : '')}
                    >
                        {userId === selectedUserId && (
                            <div className="w-1 bg-blue-900 h-12 rounded-r-lg"></div>
                        )}
                        <div className="flex gap-2 py-2 pl-4 items-center">
                            <Avatar username={onlinePeople[userId]} userId={userId} />
                            <span className="text-gray-700"> {onlinePeople[userId]}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-gray-500">&larr; No selected person.</div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div>
                            {messages.map(message => (
                                <div className="">{message.text}</div>
                            ))}
                        </div>
                    )}
                </div>
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input type="text"
                            value={newMessageText}
                            onChange={ev => setNewMessageText(ev.target.value)}
                            placeholder="Type your message here"
                            className="bg-white flex-grow border p-2 rounded-sm" />
                        <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
