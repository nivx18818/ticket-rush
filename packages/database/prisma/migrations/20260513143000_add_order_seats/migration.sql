-- CreateTable
CREATE TABLE "order_seats" (
    "order_id" UUID NOT NULL,
    "seat_id" UUID NOT NULL,
    "price_snapshot" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_seats_pkey" PRIMARY KEY ("order_id","seat_id")
);

-- CreateIndex
CREATE INDEX "order_seats_seat_id_idx" ON "order_seats"("seat_id");

-- AddForeignKey
ALTER TABLE "order_seats" ADD CONSTRAINT "order_seats_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_seats" ADD CONSTRAINT "order_seats_seat_id_fkey" FOREIGN KEY ("seat_id") REFERENCES "seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
