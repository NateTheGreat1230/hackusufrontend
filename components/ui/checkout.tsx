type props = {
    input_function: () => void,
    output_function: () => void,
}


export default function checkout({input_function, output_function}: props) {










    return (
        <>
            <h1>You are about to check out</h1>
            <div id="total cost"></div>
            <div id="row">
                <div id="accept_button">Accept</div>
                <div id="decline_button">Decline</div>
            </div>
        </>
    )
}