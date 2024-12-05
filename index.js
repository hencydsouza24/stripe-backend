require('dotenv').config();

const dns = require('node:dns');
const os = require('node:os');
const express = require('express');
const app = express();
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
let ip = ''

dns.lookup(os.hostname(), { family: 4 }, (err, addr) => {
    if (err) {
        console.error(err);
    } else {
        ip = addr;
    }
});

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
    console.log(req.path, req.method);
    next();
})

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.post('/create-checkout-session', async (req, res) => {
    const cartList = req.body.cartList;
    const serviceFee = req.body.serviceFee;

    let listItems = cartList.map(item => {
        return {
            price_data: {
                currency: 'aed',
                product_data: {
                    name: item.item_name,
                    images: ["https://www.foodiesfeed.com/wp-content/uploads/2023/06/burger-with-melted-cheese.jpg"],
                },
                unit_amount: Math.round(item.price * 100),
            },
            quantity: item.quantity,
        }
    });

    // Add service fee to the list of items
    listItems.push({
        price_data: {
            currency: 'aed',
            product_data: {
                name: "Service Fee",
            },
            unit_amount: Math.round(serviceFee * 100),
        },
        quantity: 1,
    })

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: listItems,
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/success`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    res.json({ id: session.id })
})

function calculateTotalOrderAmount(items, serviceFee) {
    return items.reduce((total, item) => total + item.price * item.quantity, 0) + serviceFee;
}
app.post("/create-payment-intent", async (req, res) => {
    const { cartList, serviceFee } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
        amount: calculateTotalOrderAmount(cartList, serviceFee) * 100,
        currency: "aed",
        description: "This is for GFG Stripe API Demo",
        automatic_payment_methods: {
            enabled: true,
        },
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

app.post('/get-split-payment-intent', async (req, res) => {
    console.log(req.body)

    res.json({message: "ok"})
})


app.listen(3003, () => {
    console.log('Server is listening on port 3003');
});